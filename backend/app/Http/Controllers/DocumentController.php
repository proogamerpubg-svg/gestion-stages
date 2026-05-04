<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\Etudiant;
use App\Models\DossierStage;
use App\Models\Stage;
use App\Services\NotificationService;

class DocumentController extends Controller
{
    protected NotificationService $notifService;

    public function __construct(NotificationService $notifService)
    {
        $this->notifService = $notifService;
    }

    // =========================================================================
    // UPLOAD DOCUMENTS PRÉALABLES (Étape 5 du workflow)
    // Convention + Assurance + Lettre de recommandation
    // =========================================================================

    /**
     * Upload d'un document préalable par l'étudiant.
     * Documents acceptés : convention, assurance, lettreRecommandation.
     * Format : PDF uniquement. Taille max : 5 Mo.
     *
     * CORRECTION BUG #1 : Statuts autorisés corrigés selon Doc v3 Partie 1, point 4.
     *   Règle :
     *   - Encadrant a confirmé → statut 'en_attente_admin' → accès documents ✅
     *   - Admin a rejeté      → statut 'rejete' + motifRejet non null → accès documents ✅
     *   - Encadrant a rejeté  → statut 'rejete' + motifRejet non null → accès BLOQUÉ ❌
     *
     *   Distinction rejet encadrant vs admin :
     *   On ne peut pas distinguer les deux avec le champ statusStage seul.
     *   Solution sans modifier la DB : vérifier si l'encadrant a déjà confirmé
     *   (= si on est jamais passé par 'en_attente_admin' avant le rejet).
     *   Approche : le rejet encadrant intervient AVANT que le dossier passe à
     *   'en_attente_admin', donc si idStage est null → rejet encadrant.
     *   Si idStage est renseigné ET statusStage = rejete → rejet admin (corrections possibles).
     *
     * CORRECTION BUG #2 : Suppression de la double mise à jour de statut incohérente.
     *   Le statut reste 'en_attente_admin' pendant tout le dépôt des documents.
     *   Il ne change pas à chaque upload — l'admin valide le dossier complet.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'typeDocument' => 'required|in:convention,assurance,lettreRecommandation',
            'fichier'      => 'required|file|mimes:pdf|max:5120', // 5 Mo max
        ]);

        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();
        $dossier  = DossierStage::where('idEtudiant', $etudiant->idEtudiant)->firstOrFail();

        // CORRECTION BUG #1 : Vérification d'accès selon Doc v3 Partie 1, point 4
        $this->verifierAccesDocuments($dossier);

        $stage   = Stage::findOrFail($dossier->idStage);
        $typeDoc = $request->typeDocument;

        // Supprimer l'ancien fichier s'il existe (évite l'accumulation dans storage)
        $ancienChemin = $stage->$typeDoc;
        if ($ancienChemin && Storage::disk('public')->exists($ancienChemin)) {
            Storage::disk('public')->delete($ancienChemin);
        }

        // Stockage : storage/app/public/documents/{idEtudiant}/{typeDoc}_{timestamp}.pdf
        $chemin = $request->fichier->storeAs(
            'documents/' . $etudiant->idEtudiant,
            $typeDoc . '_' . time() . '.pdf',
            'public'
        );

        // Mise à jour du champ correspondant dans la table stage (VARCHAR)
        $stage->update([$typeDoc => $chemin]);
        $stage->refresh();

        $tousDeposes = $stage->convention && $stage->assurance && $stage->lettreRecommandation;

        // Notification admin automatique quand TOUS les documents sont déposés
        // Cas 1 : dépôt initial (statut en_attente_admin)
        // Cas 2 : re-dépôt après correction admin (statut rejete + idStage renseigné)
        // Dans les deux cas, si tous les docs sont là → notifier admin
        if ($tousDeposes) {
            $etudiantObj = $etudiant; // déjà chargé plus haut
            $msgAdmin = $dossier->statusStage === DossierStage::STATUS_REJETE
                ? 'L\'étudiant ' . $etudiantObj->nomComplet . ' a re-soumis ses documents corrigés. Veuillez les vérifier.'
                : 'L\'étudiant ' . $etudiantObj->nomComplet . ' a déposé tous ses documents. Le dossier est prêt pour validation.';

            $this->notifService->notifierAdmin(
                $dossier->idDossier,
                'dossier_complet',
                $msgAdmin
            );
        }

        return response()->json([
            'message'     => 'Document "' . $typeDoc . '" déposé avec succès.',
            'chemin'      => $chemin,
            'tousDeposes' => $tousDeposes,
            'dossier'     => $dossier->fresh()->load('stage'),
        ]);
    }

    // =========================================================================
    // UPLOAD DOCUMENTS DE CLÔTURE (Étape 9 du workflow)
    // Attestation de fin de stage + Rapport de stage
    // =========================================================================

    /**
     * Upload d'un document de clôture par l'étudiant.
     * Documents acceptés : attestation, rapport.
     * Format : PDF uniquement. Taille max : 10 Mo.
     *
     * CORRECTION BUG #4 : Statuts autorisés corrigés.
     *   - 'journal_fin'     : étudiant a saisi les deux journaux ✅
     *   - 'cloture_deposee' : déjà commencé à déposer (pour compléter) ✅
     *
     * CORRECTION BUG #5 : Statut résultant = 'cloture_deposee' (via constante corrigée).
     *
     * CORRECTION BUG #6 : Notification encadrant ajoutée (manquait dans l'original).
     *   Doc v3 Partie 6 : quand l'étudiant dépose la clôture → Admin + Encadrant notifiés.
     */
    public function uploadCloture(Request $request)
    {
        $request->validate([
            'typeDocument' => 'required|in:attestation,rapport',
            'fichier'      => 'required|file|mimes:pdf|max:10240', // 10 Mo max pour rapport
        ]);

        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();
        $dossier  = DossierStage::where('idEtudiant', $etudiant->idEtudiant)->firstOrFail();

        // CORRECTION BUG #4 : Valeurs correctes des statuts autorisés
        $statusAutorises = [
            DossierStage::STATUS_JOURNAL_FIN,      // CORRIGÉ : était STATUS_JOURNAL_FIN_STAGE ('journal_fin_stage')
            DossierStage::STATUS_CLOTURE_DEPOSEE,  // CORRIGÉ : était STATUS_DOCUMENTS_CLOTURE_DEPOSES ('documents_cloture_deposes')
        ];

        if (! in_array($dossier->statusStage, $statusAutorises)) {
            return response()->json([
                'message' => 'Dépôt de documents de clôture non autorisé à cette étape. Statut actuel : ' . $dossier->statusStage,
            ], 403);
        }

        $stage   = Stage::findOrFail($dossier->idStage);
        $typeDoc = $request->typeDocument;

        // Stockage : storage/app/public/documents/{idEtudiant}/cloture/
        $chemin = $request->fichier->storeAs(
            'documents/' . $etudiant->idEtudiant . '/cloture',
            $typeDoc . '_' . time() . '.pdf',
            'public'
        );

        $stage->update([$typeDoc => $chemin]);
        $stage->refresh();

        // Vérifier si les 2 documents de clôture sont déposés
        $clotureComplete = $stage->attestation && $stage->rapport;

        if ($clotureComplete) {
            // CORRECTION BUG #5 : Statut correct via constante modèle corrigée
            $dossier->update([
                'statusStage' => DossierStage::STATUS_CLOTURE_DEPOSEE, // = 'cloture_deposee'
            ]);

            // CORRECTION BUG #6 : Notification Admin + Encadrant (Doc v3 Partie 6)
            // Message exact : "L'étudiant [Nom] a déposé l'attestation et le rapport."

            // Notification Admin — Plateforme uniquement
            $this->notifService->notifierAdmin(
                $dossier->idDossier,
                'cloture_deposee',
                'L\'étudiant ' . $etudiant->nomComplet . ' a déposé l\'attestation et le rapport.'
            );

            // Notification Encadrant — Plateforme uniquement (AJOUTÉ — manquait)
            $dossier->load('encadrant');
            $this->notifService->notifier(
                $dossier->encadrant->idCompte,
                $dossier->idDossier,
                'cloture_deposee',
                'L\'étudiant ' . $etudiant->nomComplet . ' a déposé l\'attestation et le rapport.'
            );
        }

        return response()->json([
            'message'          => 'Document "' . $typeDoc . '" de clôture déposé avec succès.',
            'clotureComplete'  => $clotureComplete,
            'dossier'          => $dossier->fresh()->load('stage'),
        ]);
    }

    // =========================================================================
    // MODÈLES TÉLÉCHARGEABLES
    // =========================================================================

    /**
     * Liste les modèles de documents disponibles au téléchargement.
     * Accessible uniquement si l'encadrant a confirmé (statut en_attente_admin ou plus).
     * Doc v3 Partie 1, point 4.
     */
    public function listeModeles(Request $request)
    {
        $modeles = [
            [
                'nom'         => 'Convention de stage',
                'fichier'     => 'modele_convention.pdf',
                'description' => 'À faire signer par l\'organisme d\'accueil et l\'ENCG.',
            ],
            [
                'nom'         => 'Attestation d\'assurance',
                'fichier'     => 'modele_assurance.pdf',
                'description' => 'Attestation d\'assurance responsabilité civile.',
            ],
            [
                'nom'         => 'Lettre de recommandation',
                'fichier'     => 'modele_lettre_recommandation.pdf',
                'description' => 'Lettre de recommandation ENCG à présenter à l\'organisme.',
            ],
        ];

        return response()->json(['modeles' => $modeles]);
    }

    /**
     * Télécharger un modèle de document.
     * Whitelist stricte pour éviter toute traversée de chemin (path traversal).
     */
    public function telechargerModele(Request $request, string $fichier)
    {
        $fichiersAutorises = [
            'modele_convention.pdf',
            'modele_assurance.pdf',
            'modele_lettre_recommandation.pdf',
        ];

        if (! in_array($fichier, $fichiersAutorises)) {
            return response()->json(['message' => 'Modèle introuvable.'], 404);
        }

        $chemin = Storage::disk('public')->path('modeles/' . $fichier);

        if (! file_exists($chemin)) {
            return response()->json([
                'message' => 'Modèle non encore disponible. Contactez l\'administration.',
                'fichier' => $fichier,
            ], 202);
        }

        return response()->download($chemin, $fichier, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    // =========================================================================
    // VALIDER CORRECTION DOCUMENTS — bouton "J'ai corrigé mes documents"
    // L'étudiant notifie l'admin qu'il a re-déposé les documents corrigés
    // =========================================================================
    public function validerCorrection(Request $request)
    {
        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->firstOrFail();
        $dossier  = DossierStage::where('idEtudiant', $etudiant->idEtudiant)->firstOrFail();

        // Autorisé uniquement si rejet admin (idStage renseigné)
        if ($dossier->statusStage !== DossierStage::STATUS_REJETE || empty($dossier->idStage)) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $stage = Stage::findOrFail($dossier->idStage);
        $tousDeposes = $stage->convention && $stage->assurance && $stage->lettreRecommandation;

        if (! $tousDeposes) {
            return response()->json([
                'message' => 'Vous devez d\'abord déposer tous les documents avant de soumettre la correction.',
            ], 422);
        }

        // Remettre le statut en_attente_admin + notifier l'admin
        $dossier->update([
            'statusStage' => DossierStage::STATUS_EN_ATTENTE_ADMIN,
            'motifRejet'  => null,
            'typeCorrection' => null,
        ]);

        $this->notifService->notifierAdmin(
            $dossier->idDossier,
            'dossier_complet',
            'L\'étudiant ' . $etudiant->nomComplet . ' a corrigé et re-soumis ses documents.'
        );

        return response()->json([
            'message' => 'Correction soumise avec succès. L\'administration a été notifiée.',
        ]);
    }

    // =========================================================================
    // HELPER PRIVÉ — Vérification d'accès aux documents
    // =========================================================================

    /**
     * Vérifie que l'étudiant a le droit de déposer des documents préalables.
     *
     * Règles (Doc v3 Partie 1, point 4) :
     *   ✅ Encadrant a confirmé         → statusStage = 'en_attente_admin'
     *   ✅ Admin a rejeté (corrections) → statusStage = 'rejete' ET idStage non null
     *   ❌ Encadrant a rejeté           → statusStage = 'rejete' ET idStage null (ou stage sans organisme)
     *   ❌ Tout autre statut            → bloqué
     *
     * Distinction rejet encadrant / admin :
     *   Le rejet encadrant intervient AVANT la confirmation → le dossier n'a jamais eu de stage.
     *   Si idStage est null → c'est un rejet encadrant → accès bloqué.
     *   Si idStage est renseigné ET statusStage = 'rejete' → rejet admin → accès accordé.
     */
    private function verifierAccesDocuments(DossierStage $dossier): void
    {
        $statut = $dossier->statusStage;

        // Cas 1 : encadrant a confirmé → accès autorisé
        if ($statut === DossierStage::STATUS_EN_ATTENTE_ADMIN) {
            return;
        }

        // Cas 2 : rejet admin (idStage renseigné) → accès autorisé pour corriger
        if ($statut === DossierStage::STATUS_REJETE && ! empty($dossier->idStage)) {
            return;
        }

        // Cas 3 : rejet encadrant (idStage null) ou tout autre statut → accès bloqué
        abort(403, 'Dépôt de documents non autorisé à cette étape. Statut actuel : ' . $statut);
    }
}