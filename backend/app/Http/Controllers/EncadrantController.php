<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\EncadrantPedagogique;
use App\Models\DossierStage;
use App\Services\NotificationService;

class EncadrantController extends Controller
{
    protected NotificationService $notifService;

    public function __construct(NotificationService $notifService)
    {
        $this->notifService = $notifService;
    }

    // =========================================================================
    // TABLEAU DE BORD — Liste des étudiants encadrés
    // =========================================================================

    /**
     * Retourne la liste des étudiants affectés à l'encadrant connecté.
     *
     * CORRECTION : Ajout des filtres recherche + statut (Doc v3 Partie 2, point 8).
     * Le tableau de bord encadrant doit permettre de filtrer par nom et par statut.
     */
    public function mesEtudiants(Request $request)
    {
        $compte    = $request->user();
        $encadrant = EncadrantPedagogique::where('idCompte', $compte->idCompte)->firstOrFail();

        $query = DossierStage::with(['etudiant', 'stage.organisme'])
            ->where('idEncadrant', $encadrant->idEncadrant);

        // Filtre par statut (Doc v3 Partie 2, point 8)
        if ($request->filled('status')) {
            $query->where('statusStage', $request->status);
        }

        // Recherche par nom étudiant (Doc v3 Partie 2, point 8)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('etudiant', function ($q) use ($search) {
                $q->where('nomComplet', 'like', "%{$search}%")
                  ->orWhere('CNE', 'like', "%{$search}%");
            });
        }

        $dossiers = $query->orderBy('idDossier', 'desc')->get();

        return response()->json([
            'encadrant' => $encadrant,
            'etudiants' => $dossiers,
            'total'     => $dossiers->count(),
        ]);
    }

    // =========================================================================
    // VOIR UN DOSSIER ÉTUDIANT
    // =========================================================================

    /**
     * Voir le dossier complet d'un étudiant encadré.
     * L'encadrant ne peut accéder qu'aux dossiers de ses propres étudiants.
     *
     * AJOUT : méthode absente dans l'original (Doc v3 Partie 2, point 10).
     */
    public function voirDossier(Request $request, int $id)
    {
        $encadrant = $this->getEncadrant($request);

        $dossier = DossierStage::with(['etudiant', 'stage.organisme'])
            ->where('idDossier', $id)
            ->where('idEncadrant', $encadrant->idEncadrant)
            ->firstOrFail();

        return response()->json(['dossier' => $dossier]);
    }

    // =========================================================================
    // CONFIRMER / REJETER L'ENCADREMENT (Étape 4 du workflow)
    // =========================================================================

    /**
     * L'encadrant confirme la demande d'encadrement.
     * Statut : declare → en_attente_admin
     *
     * AJOUT : méthode déplacée depuis DossierStageController vers ici
     * (logique RBAC — action propre au rôle encadrant).
     *
     * Doc v3 Partie 6 — Texte notification exact :
     * "Encadrement confirmé. Accès documents débloqué."
     */
    public function confirmerEncadrement(Request $request, int $id)
    {
        $encadrant = $this->getEncadrant($request);
        $dossier   = $this->getDossierEncadrant($id, $encadrant->idEncadrant);

        if ($dossier->statusStage !== DossierStage::STATUS_DECLARE) {
            return response()->json([
                'message' => 'Action non disponible à cette étape. Statut actuel : ' . $dossier->statusStage,
            ], 403);
        }

        $dossier->update([
            'statusStage' => DossierStage::STATUS_EN_ATTENTE_ADMIN,
        ]);

        // Notification étudiant — Email + Plateforme (Doc v3 Partie 6)
        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'validation',
            'Encadrement confirmé. Accès documents débloqué.'
        );

        return response()->json([
            'message' => 'Encadrement confirmé. L\'étudiant peut déposer ses documents.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * L'encadrant rejette la demande d'encadrement.
     * Statut : declare → rejete
     *
     * AJOUT : méthode déplacée depuis DossierStageController vers ici.
     *
     * Conséquence (Doc v3 Partie 1, point 4) :
     * Rejet encadrant = accès totalement bloqué → l'étudiant repart de zéro.
     *
     * Doc v3 Partie 6 — Texte notification exact :
     * "Demande rejetée. Motif : [motifRejet]"
     */
    public function rejeterEncadrement(Request $request, int $id)
    {
        $request->validate([
            'motif' => 'required|string|min:10',
        ]);

        $encadrant = $this->getEncadrant($request);
        $dossier   = $this->getDossierEncadrant($id, $encadrant->idEncadrant);

        if ($dossier->statusStage !== DossierStage::STATUS_DECLARE) {
            return response()->json([
                'message' => 'Action non disponible à cette étape. Statut actuel : ' . $dossier->statusStage,
            ], 403);
        }

        /**
         * CORRECTION BUG REJET ENCADRANT :
         *
         * Quand l'encadrant rejette, on remet idStage à NULL.
         * Pourquoi ? Car le frontend distingue les deux types de rejet ainsi :
         *   - idStage IS NULL  → rejet encadrant  → nouvelle demande obligatoire
         *   - idStage NOT NULL → rejet admin       → correction du même dossier
         *
         * Sans ce NULL, le frontend ne peut pas différencier les deux cas.
         *
         * Le stage et l'organisme associés sont supprimés via ON DELETE SET NULL
         * (contrainte FK définie dans la migration).
         *
         * Règle métier (Doc v3 Partie 1, point 6) :
         * Rejet encadrant = retour étape 1, NOUVELLE demande obligatoire.
         */
        $idStageASupprimer = $dossier->idStage;

        $dossier->update([
            'statusStage' => DossierStage::STATUS_REJETE,
            'motifRejet'  => $request->motif,
            'idStage'     => null,   // ← FIX : permet la distinction frontend rejet encadrant vs admin
            'dateDebut'   => null,
            'dateFin'     => null,
        ]);

        // Supprimer le stage + organisme associés si ils existent
        if ($idStageASupprimer) {
            $stage = \App\Models\Stage::find($idStageASupprimer);
            if ($stage) {
                $idOrganisme = $stage->idOrganisme;
                $stage->delete();
                if ($idOrganisme) {
                    \App\Models\OrganismeAccueil::find($idOrganisme)?->delete();
                }
            }
        }

        // Notification étudiant — Email + Plateforme (Doc v3 Partie 6)
        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'rejet',
            'Demande rejetée. Motif : ' . $request->motif
        );

        return response()->json([
            'message' => 'Demande d\'encadrement rejetée.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    // =========================================================================
    // JOURNAL DE BORD — Commentaires encadrant (Étapes 7 et 8)
    // =========================================================================

    /**
     * L'encadrant commente le journal de mi-stage de l'étudiant.
     * Écrit dans reponseMission1 (pas observationEncadrant1 — champ supprimé).
     *
     * AJOUT : méthode déplacée depuis DossierStageController vers ici.
     * Accessible uniquement si statut = journal_mi.
     */
    public function commenterMiStage(Request $request, int $id)
    {
        $request->validate([
            'commentaire' => 'required|string|min:20',
        ]);

        $encadrant = $this->getEncadrant($request);
        $dossier   = $this->getDossierEncadrant($id, $encadrant->idEncadrant);

        if ($dossier->statusStage !== DossierStage::STATUS_JOURNAL_MI) {
            return response()->json([
                'message' => 'Le journal de mi-stage n\'a pas encore été saisi par l\'étudiant.',
            ], 403);
        }

        $dossier->update([
            'reponseMission1' => $request->commentaire, // champ correct (observationEncadrant1 supprimé)
        ]);

        // Notification étudiant — Plateforme uniquement (Doc v3 Partie 6)
        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'observation',
            'Votre encadrant a ajouté un commentaire sur votre journal de mi-stage.'
        );

        return response()->json([
            'message' => 'Commentaire mi-stage enregistré.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * L'encadrant commente le journal de fin de stage de l'étudiant.
     * Écrit dans reponseMission2 (pas observationEncadrant2 — champ supprimé).
     *
     * AJOUT : méthode déplacée depuis DossierStageController vers ici.
     * Accessible uniquement si statut = journal_fin.
     */
    public function commenterFinStage(Request $request, int $id)
    {
        $request->validate([
            'commentaire' => 'required|string|min:20',
        ]);

        $encadrant = $this->getEncadrant($request);
        $dossier   = $this->getDossierEncadrant($id, $encadrant->idEncadrant);

        if ($dossier->statusStage !== DossierStage::STATUS_JOURNAL_FIN) {
            return response()->json([
                'message' => 'Le journal de fin de stage n\'a pas encore été saisi par l\'étudiant.',
            ], 403);
        }

        $dossier->update([
            'reponseMission2' => $request->commentaire, // champ correct (observationEncadrant2 supprimé)
        ]);

        // Notification étudiant — Plateforme uniquement (Doc v3 Partie 6)
        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'observation',
            'Votre encadrant a ajouté un commentaire sur votre journal de fin de stage.'
        );

        return response()->json([
            'message' => 'Commentaire fin de stage enregistré.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    // =========================================================================
    // AVIS PÉDAGOGIQUE FINAL (Étape 11 du workflow)
    // =========================================================================

    /**
     * L'encadrant émet son avis pédagogique final.
     * Statut : cloture_deposee → valide_encadrant
     *
     * AJOUT : méthode déplacée depuis DossierStageController vers ici.
     * Accessible uniquement si statut = cloture_deposee.
     *
     * Doc v3 Partie 6 — Texte notification admin :
     * "L'encadrant [Nom] a validé le stage de [Étudiant]."
     */
    public function avisPedagogique(Request $request, int $id)
    {
        $request->validate([
            'avis' => 'required|string|min:30',
        ]);

        $encadrant = $this->getEncadrant($request);
        $dossier   = $this->getDossierEncadrant($id, $encadrant->idEncadrant);

        if ($dossier->statusStage !== DossierStage::STATUS_CLOTURE_DEPOSEE) {
            return response()->json([
                'message' => 'L\'avis pédagogique n\'est accessible qu\'après le dépôt des documents de clôture. Statut actuel : ' . $dossier->statusStage,
            ], 403);
        }

        $dossier->update([
            'avisEncadrant' => $request->avis,
            'statusStage'   => DossierStage::STATUS_VALIDE_ENCADRANT,
        ]);

        // Notification admin — Plateforme uniquement (Doc v3 Partie 6)
        $this->notifService->notifierAdmin(
            $dossier->idDossier,
            'avis_final',
            'L\'encadrant ' . $encadrant->nomComplet . ' a validé le stage de ' . $dossier->etudiant->nomComplet . '.'
        );

        return response()->json([
            'message' => 'Avis pédagogique final enregistré. Dossier prêt pour la validation finale de l\'administration.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    /**
     * Récupère l'encadrant lié au compte connecté.
     */
    private function getEncadrant(Request $request): EncadrantPedagogique
    {
        $compte = $request->user();
        return EncadrantPedagogique::where('idCompte', $compte->idCompte)->firstOrFail();
    }

    /**
     * Récupère un dossier en vérifiant qu'il appartient bien à cet encadrant.
     */
    private function getDossierEncadrant(int $idDossier, int $idEncadrant): DossierStage
    {
        return DossierStage::with(['etudiant', 'encadrant'])
            ->where('idDossier', $idDossier)
            ->where('idEncadrant', $idEncadrant)
            ->firstOrFail(); // 404 si dossier inexistant ou appartient à un autre encadrant
    }
}