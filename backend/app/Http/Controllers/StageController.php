<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Etudiant;
use App\Models\Stage;
use App\Models\OrganismeAccueil;
use App\Models\DossierStage;
use App\Services\NotificationService;

class StageController extends Controller
{
    protected NotificationService $notifService;

    public function __construct(NotificationService $notifService)
    {
        $this->notifService = $notifService;
    }

    // =========================================================================
    // DÉCLARER UN STAGE (Étape 3 du workflow)
    // =========================================================================

    /**
     * L'étudiant soumet sa déclaration de stage.
     * Crée l'organisme d'accueil + le stage + met à jour le dossier.
     * Statut résultant : declare
     *
     * Champs acceptés (Doc v3 Partie 1, point 2) :
     *   - Informations du stage : sujetStage, dateDebut, dateFin
     *   - Organisme d'accueil  : raisonSociale, secteur, adresse
     *   - Responsable de stage : nomCompletResponsable, telephoneResponsable, emailResponsable
     *
     * NOTE IMPORTANTE (Doc v3 Partie 1, point 2) :
     *   mission1 et mission2 ne font PAS partie de ce formulaire.
     *   Ils sont réservés au journal de bord uniquement.
     *   Le backend ne les accepte pas ici — correction à faire côté React (DeclarerStage.jsx).
     */
    public function declarer(Request $request)
    {
        $request->validate([
            // Informations du stage
            'sujetStage'             => 'required|string',
            'dateDebut'              => 'required|date',
            'dateFin'                => 'required|date|after:dateDebut',

            // Organisme d'accueil
            'raisonSociale'          => 'required|string|max:150',
            'secteur'                => 'nullable|string|max:100',
            'adresse'                => 'required|string|max:255',

            // Responsable de stage
            'nomCompletResponsable'  => 'required|string|max:100',
            'telephoneResponsable'   => 'required|string|max:20',
            'emailResponsable'       => 'required|email|max:100',

            // SUPPRIMÉS : mission1, mission2 — réservés au journal de bord uniquement
        ]);

        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();

        // Vérification que le dossier existe (créé par import Excel)
        $dossier = DossierStage::where('idEtudiant', $etudiant->idEtudiant)->first();
        if (! $dossier) {
            return response()->json([
                'message' => 'Aucun dossier trouvé. Votre affectation n\'a pas encore été importée par l\'administration.',
            ], 403);
        }

        // Vérification que la déclaration est autorisée :
        // - Première déclaration : statusStage IS NULL
        // - Re-déclaration après rejet ENCADRANT : statusStage = 'rejete' ET idStage IS NULL
        //   (l'encadrant a rejeté → idStage remis à NULL → l'étudiant peut refaire une nouvelle demande)
        // - Correction après rejet ADMIN : géré par StageController::modifier() (idStage NOT NULL)
        $peutDeclarer = $dossier->statusStage === null
            || ($dossier->statusStage === DossierStage::STATUS_REJETE && $dossier->idStage === null);

        if (! $peutDeclarer) {
            return response()->json([
                'message' => 'Déclaration impossible. Statut actuel : ' . $dossier->statusStage
                    . ($dossier->idStage ? ' (utilisez la modification pour corriger votre dossier)' : ''),
            ], 409);
        }

        // --- Validation des dates métier ---
        $dateDebut = \Carbon\Carbon::parse($request->dateDebut)->startOfDay();
        $dateFin   = \Carbon\Carbon::parse($request->dateFin)->startOfDay();
        $annee     = $dateDebut->year;

        // Règle : stage doit être dans l'année courante, entre le 1er juin et le 31 août
        $anneeActuelle = now()->year;
        if ($annee !== $anneeActuelle) {
            return response()->json([
                'message' => "Le stage doit se dérouler en {$anneeActuelle}. Veuillez sélectionner des dates de {$anneeActuelle}.",
            ], 422);
        }

        $periodeDebut = \Carbon\Carbon::createFromDate($annee, 6, 1)->startOfDay();
        $periodeFin   = \Carbon\Carbon::createFromDate($annee, 8, 31)->startOfDay();

        if ($dateDebut->lt($periodeDebut) || $dateFin->gt($periodeFin)) {
            return response()->json([
                'message' => 'La période du stage doit se situer entre le 1er juin et le 31 août.',
            ], 422);
        }

        // Règle : durée = 1 mois (tolérance 28–31 jours pour couvrir tous les mois)
        $diffJours = $dateDebut->diffInDays($dateFin);
        if ($diffJours < 28 || $diffJours > 31) {
            return response()->json([
                'message' => 'La durée du stage doit être exactement d\'1 mois (exemple : du 01/06 au 30/06).',
            ], 422);
        }

        // --- Transaction DB : création organisme + stage + mise à jour dossier ---
        DB::transaction(function () use ($request, $dossier, $dateDebut, $dateFin, $annee) {
            $organisme = OrganismeAccueil::create([
                'raisonSociale'         => $request->raisonSociale,
                'adresse'               => $request->adresse,
                'secteur'               => $request->secteur,
                'type'                  => $request->typeOrganisme ?? 'prive',
                'nomCompletResponsable' => $request->nomCompletResponsable,
                'telephoneResponsable'  => $request->telephoneResponsable,
                'emailResponsable'      => $request->emailResponsable,
            ]);

            $stage = Stage::create([
                'sujetStage'  => $request->sujetStage,
                'periode'     => $dateDebut->format('d/m/Y') . ' - ' . $dateFin->format('d/m/Y'),
                'type'        => 'Initiation',
                'idOrganisme' => $organisme->idOrganisme,
            ]);

            $dossier->update([
                'idStage'            => $stage->idStage,
                'dateDebut'          => $dateDebut->format('Y-m-d'),
                'dateFin'            => $dateFin->format('Y-m-d'),
                'statusStage'        => DossierStage::STATUS_DECLARE,
                // CORRECTION BUG #2 : format tiret (pas slash) — ex: "2025-2026"
                'anneeUniversitaire' => $annee . '-' . ($annee + 1),
                'motifRejet'         => null, // effacer tout rejet précédent
            ]);
        });

        // Recharger le dossier après transaction
        $dossier->refresh()->load(['encadrant', 'etudiant', 'stage.organisme']);

        // Notification encadrant : plateforme + EMAIL (format officiel ENCGO)
        $this->notifService->notifierEncadrant($dossier);

        return response()->json([
            'message' => 'Stage déclaré avec succès. Votre encadrant a été notifié.',
            'dossier' => $dossier,
        ], 201);
    }

    // =========================================================================
    // MODIFIER UN STAGE (après rejet uniquement)
    // =========================================================================

    /**
     * L'étudiant corrige et resoumet sa déclaration après un rejet.
     * Accessible uniquement si statut = rejete.
     * Statut résultant : declare (re-soumission à l'encadrant)
     *
     * CORRECTION BUG #4 : Ajout notification encadrant après correction.
     * CORRECTION BUG #5 : Ajout des validations de période et durée (identiques à declarer).
     */
    public function modifier(Request $request)
    {
        $request->validate([
            // Informations du stage
            'sujetStage'             => 'required|string',
            'dateDebut'              => 'required|date',
            'dateFin'                => 'required|date|after:dateDebut',

            // Organisme d'accueil
            'raisonSociale'          => 'required|string|max:150',
            'adresse'                => 'required|string|max:255',

            // Responsable de stage
            'nomCompletResponsable'  => 'required|string|max:100',
            'telephoneResponsable'   => 'required|string|max:20',
            'emailResponsable'       => 'required|email|max:100',
        ]);

        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();
        $dossier  = DossierStage::where('idEtudiant', $etudiant->idEtudiant)->firstOrFail();

        // Modification uniquement autorisée si statut = rejete
        if ($dossier->statusStage !== DossierStage::STATUS_REJETE) {
            return response()->json([
                'message' => 'Modification impossible. Le dossier ne peut être modifié que s\'il a été rejeté. Statut actuel : ' . $dossier->statusStage,
            ], 403);
        }

        // CORRECTION BUG #5 : Mêmes validations métier que declarer()
        $dateDebut = \Carbon\Carbon::parse($request->dateDebut)->startOfDay();
        $dateFin   = \Carbon\Carbon::parse($request->dateFin)->startOfDay();
        $annee     = $dateDebut->year;

        $periodeDebut = \Carbon\Carbon::createFromDate($annee, 6, 1)->startOfDay();
        $periodeFin   = \Carbon\Carbon::createFromDate($annee, 8, 31)->startOfDay();

        if ($dateDebut->lt($periodeDebut) || $dateFin->gt($periodeFin)) {
            return response()->json([
                'message' => 'La période du stage doit se situer entre le 1er juin et le 31 août.',
            ], 422);
        }

        $diffJours = $dateDebut->diffInDays($dateFin);
        if ($diffJours < 28 || $diffJours > 31) {
            return response()->json([
                'message' => 'La durée du stage doit être exactement d\'1 mois (exemple : du 01/06 au 30/06).',
            ], 422);
        }

        // Récupérer les entités liées
        $stage     = Stage::findOrFail($dossier->idStage);
        $organisme = OrganismeAccueil::findOrFail($stage->idOrganisme);

        // --- Transaction DB : mise à jour organisme + stage + dossier ---
        DB::transaction(function () use ($request, $dossier, $stage, $organisme, $dateDebut, $dateFin) {
            $organisme->update([
                'raisonSociale'         => $request->raisonSociale,
                'adresse'               => $request->adresse,
                'secteur'               => $request->secteur,
                'type'                  => $request->typeOrganisme ?? $organisme->type,
                'nomCompletResponsable' => $request->nomCompletResponsable,
                'telephoneResponsable'  => $request->telephoneResponsable,
                'emailResponsable'      => $request->emailResponsable,
            ]);

            $stage->update([
                'sujetStage' => $request->sujetStage,
                'periode'    => $dateDebut->format('d/m/Y') . ' - ' . $dateFin->format('d/m/Y'),
            ]);

            $dossier->update([
                'dateDebut'   => $dateDebut->format('Y-m-d'),
                'dateFin'     => $dateFin->format('Y-m-d'),
                /**
                 * CORRECTION WORKFLOW REJET ADMIN :
                 * Après rejet admin, l'encadrant a déjà validé → on revient
                 * directement à 'en_attente_admin', pas à 'declare'.
                 * L'encadrant ne doit PAS être re-notifié.
                 */
                'statusStage' => DossierStage::STATUS_EN_ATTENTE_ADMIN,
                'motifRejet'  => null,
            ]);
        });

        $dossier->refresh()->load(['encadrant', 'etudiant', 'stage.organisme']);

        // Notifier l'ADMIN (pas l'encadrant) que le dossier a été corrigé
        $this->notifService->notifierAdmin(
            $dossier->idDossier,
            'dossier_complet',
            'L\'étudiant ' . $dossier->etudiant->nomComplet . ' a corrigé son dossier suite au rejet. En attente de validation.'
        );

        return response()->json([
            'message' => 'Dossier corrigé et resoumis avec succès. L\'administration a été notifiée.',
            'dossier' => $dossier,
        ]);
    }
}