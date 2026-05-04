<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Etudiant;
use App\Models\DossierStage;
use App\Services\NotificationService;

// NETTOYAGE : Import EncadrantPedagogique supprimé — plus utilisé dans ce contrôleur.
// Les actions encadrant sont désormais dans EncadrantController (logique RBAC correcte).

class DossierStageController extends Controller
{
    protected NotificationService $notifService;

    public function __construct(NotificationService $notifService)
    {
        $this->notifService = $notifService;
    }

    // =========================================================================
    // STATUTS — Valeurs officielles (Doc Corrections v3 — Partie 6)
    // =========================================================================
    // declare          → Étudiant a soumis sa déclaration
    // en_attente_admin → Encadrant a confirmé (ou auto 24h) → en attente admin
    // rejete           → Rejeté par encadrant ou admin
    // en_cours         → Admin a validé le dossier (1ère validation)
    // journal_mi       → Étudiant a saisi le journal de mi-stage
    // journal_fin      → Étudiant a saisi le journal de fin de stage
    // cloture_deposee  → Étudiant a déposé attestation + rapport
    // valide_encadrant → Encadrant a émis son avis pédagogique final
    // cloture          → Admin a validé finalement
    // archive          → Dossier archivé
    // =========================================================================

    // =========================================================================
    // CONSULTATION DOSSIER
    // =========================================================================

    /**
     * Retourne le dossier complet de l'étudiant connecté.
     * Utilisé par : rôle étudiant uniquement.
     */
    public function monDossier(Request $request)
    {
        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();

        $dossier = DossierStage::with(['etudiant', 'encadrant', 'stage.organisme'])
            ->where('idEtudiant', $etudiant->idEtudiant)
            ->first();

        if (! $dossier) {
            return response()->json([
                'message' => 'Aucun dossier trouvé. L\'administration n\'a pas encore importé vos données.',
                'dossier' => null,
            ]);
        }

        return response()->json(['dossier' => $dossier]);
    }

    /**
     * Consulter un dossier par ID.
     * Utilisé par : admin, sys_admin, directeur.
     * Note : les encadrants utilisent EncadrantController::voirDossier (sécurisé par idEncadrant).
     */
    public function voirDossier(Request $request, int $id)
    {
        $dossier = DossierStage::with(['etudiant', 'encadrant', 'stage.organisme'])
            ->findOrFail($id);

        return response()->json(['dossier' => $dossier]);
    }

    // =========================================================================
    // JOURNAL DE BORD — SAISIE ÉTUDIANT (Étapes 7 et 8 du workflow)
    // =========================================================================

    /**
     * Saisie 1 du journal de bord : mi-stage (par l'étudiant).
     * Accessible uniquement si statut = en_cours.
     *
     * Champ DB : mission1 (saisi par l'étudiant)
     * Statut résultant : journal_mi
     */
    public function saisirJournalMiStage(Request $request)
    {
        $request->validate([
            'mission1' => 'required|string|min:50',
        ]);

        $dossier = $this->getDossierEtudiant($request);

        if ($dossier->statusStage !== DossierStage::STATUS_EN_COURS) {
            return response()->json([
                'message' => 'Le journal de mi-stage n\'est accessible que lorsque le stage est en cours.',
            ], 403);
        }

        $dossier->update([
            'mission1'    => $request->mission1,
            'statusStage' => DossierStage::STATUS_JOURNAL_MI,
        ]);

        // Notification encadrant — Plateforme uniquement (Doc v3 Partie 6)
        $this->notifService->notifier(
            $dossier->encadrant->idCompte,
            $dossier->idDossier,
            'journal',
            'L\'étudiant ' . $dossier->etudiant->nomComplet . ' a saisi son journal de mi-stage.'
        );

        return response()->json([
            'message' => 'Journal de mi-stage saisi avec succès.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * Saisie 2 du journal de bord : fin de stage (par l'étudiant).
     * Accessible uniquement si statut = journal_mi ET encadrant a commenté (reponseMission1 non null).
     *
     * Champ DB : mission2 (saisi par l'étudiant)
     * Statut résultant : journal_fin
     */
    public function saisirJournalFinStage(Request $request)
    {
        $request->validate([
            'mission2' => 'required|string|min:50',
        ]);

        $dossier = $this->getDossierEtudiant($request);

        if ($dossier->statusStage !== DossierStage::STATUS_JOURNAL_MI) {
            return response()->json([
                'message' => 'Le journal de fin de stage n\'est accessible qu\'après la saisie du journal de mi-stage.',
            ], 403);
        }

        // Vérification que l'encadrant a bien commenté le mi-stage avant de continuer
        if (empty($dossier->reponseMission1)) {
            return response()->json([
                'message' => 'Vous ne pouvez pas saisir le journal de fin de stage tant que votre encadrant n\'a pas commenté votre journal de mi-stage.',
            ], 403);
        }

        $dossier->update([
            'mission2'    => $request->mission2,
            'statusStage' => DossierStage::STATUS_JOURNAL_FIN,
        ]);

        // Notification encadrant — Plateforme uniquement (Doc v3 Partie 6)
        $this->notifService->notifier(
            $dossier->encadrant->idCompte,
            $dossier->idDossier,
            'journal',
            'L\'étudiant ' . $dossier->etudiant->nomComplet . ' a saisi son journal de fin de stage.'
        );

        return response()->json([
            'message' => 'Journal de fin de stage saisi avec succès.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    // =========================================================================
    // MÉTHODES SUPPRIMÉES — Déplacées dans EncadrantController
    // =========================================================================
    // accepterEncadrement()  → EncadrantController::confirmerEncadrement()
    // refuserEncadrement()   → EncadrantController::rejeterEncadrement()
    // observationMiStage()   → EncadrantController::commenterMiStage()
    // observationFinStage()  → EncadrantController::commenterFinStage()
    // avisFinal()            → EncadrantController::avisPedagogique()
    // verifierEncadrant()    → Helper privé dans EncadrantController
    // =========================================================================

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    /**
     * Récupère le dossier de stage de l'étudiant connecté.
     * Utilisé uniquement pour les actions étudiant (journal).
     */
    private function getDossierEtudiant(Request $request): DossierStage
    {
        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();

        return DossierStage::with(['encadrant', 'etudiant'])
            ->where('idEtudiant', $etudiant->idEtudiant)
            ->firstOrFail();
    }
}