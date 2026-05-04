<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DossierStage;
use App\Models\Etudiant;
use App\Models\EncadrantPedagogique;
use App\Services\NotificationService;

class AdminController extends Controller
{
    protected NotificationService $notifService;

    public function __construct(NotificationService $notifService)
    {
        $this->notifService = $notifService;
    }

    public function listeDossiers(Request $request)
    {
        $query = DossierStage::with(['etudiant', 'encadrant', 'stage.organisme'])
            ->orderBy('idDossier', 'desc');

        if ($request->filled('status')) {
            $query->where('statusStage', $request->status);
        }
        if ($request->filled('annee')) {
            $query->where('anneeUniversitaire', $request->annee);
        }
        if ($request->filled('niveau')) {
            $niveau = $request->niveau;
            $query->whereHas('etudiant', function ($q) use ($niveau) {
                $q->where('niveau', $niveau);
            });
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('etudiant', function ($q) use ($search) {
                $q->where('nomComplet', 'like', "%{$search}%")
                  ->orWhere('CNE', 'like', "%{$search}%");
            });
        }
        if (! $request->boolean('includeArchives')) {
            $query->where('statusStage', '!=', 'archive');
        }

        return response()->json($query->paginate(20));
    }

    public function dossierArchives(Request $request)
    {
        $query = DossierStage::with(['etudiant', 'encadrant', 'stage.organisme'])
            ->where('statusStage', 'archive')
            ->orderBy('dateArchivage', 'desc');

        if ($request->filled('annee')) {
            $query->where('anneeUniversitaire', $request->annee);
        }
        if ($request->filled('niveau')) {
            $niveau = $request->niveau;
            $query->whereHas('etudiant', function ($q) use ($niveau) {
                $q->where('niveau', $niveau);
            });
        }

        return response()->json($query->paginate(20));
    }

    public function voirDossier(Request $request, int $id)
    {
        $dossier = DossierStage::with(['etudiant', 'encadrant', 'stage.organisme'])
            ->findOrFail($id);
        return response()->json(['dossier' => $dossier]);
    }

    public function valider(Request $request, int $id)
    {
        $dossier = DossierStage::with(['etudiant', 'encadrant'])->findOrFail($id);

        if ($dossier->statusStage !== 'en_attente_admin') {
            return response()->json([
                'message' => 'Ce dossier n\'est pas en attente de validation. Statut : ' . $dossier->statusStage,
            ], 409);
        }

        $dossier->update([
            'statusStage'    => 'en_cours',
            'dateValidation' => now()->format('Y-m-d'),
            'motifRejet'     => null,
            'typeCorrection' => null,
        ]);

        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'validation',
            'Dossier validé. Votre stage est officiel.'
        );
        $this->notifService->notifier(
            $dossier->encadrant->idCompte,
            $dossier->idDossier,
            'validation',
            'Le dossier de ' . $dossier->etudiant->nomComplet . ' a été validé. Le stage est officiellement en cours.'
        );

        return response()->json(['message' => 'Dossier validé.', 'dossier' => $dossier->fresh()]);
    }

    /**
     * REJETER avec type de correction :
     *   - typeCorrection = 'documents' → l'étudiant doit re-déposer des documents
     *   - typeCorrection = 'infos'     → l'étudiant doit corriger sa déclaration
     */
    public function rejeter(Request $request, int $id)
    {
        $request->validate([
            'motif'          => 'required|string|min:10',
            'typeCorrection' => 'required|in:documents,infos',
        ]);

        $dossier = DossierStage::with(['etudiant'])->findOrFail($id);

        $statusRejettables = ['en_attente_admin', 'cloture_deposee'];

        if (! in_array($dossier->statusStage, $statusRejettables)) {
            return response()->json([
                'message' => 'Ce dossier ne peut pas être rejeté. Statut : ' . $dossier->statusStage,
            ], 409);
        }

        $dossier->update([
            'statusStage'    => 'rejete',
            'motifRejet'     => $request->motif,
            'typeCorrection' => $request->typeCorrection,
        ]);

        // Message adapté selon le type de correction
        $msgEtudiant = $request->typeCorrection === 'documents'
            ? 'Corrections demandées sur vos documents. Motif : ' . $request->motif . ' — Veuillez re-déposer le(s) document(s) concerné(s) depuis la page "Déposer documents".'
            : 'Corrections demandées sur votre déclaration. Motif : ' . $request->motif . ' — Veuillez corriger votre déclaration de stage.';

        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'rejet',
            $msgEtudiant
        );

        return response()->json([
            'message' => 'Dossier rejeté. L\'étudiant a été notifié.',
            'dossier' => $dossier->fresh(),
        ]);
    }

    public function validerFinal(Request $request, int $id)
    {
        $dossier = DossierStage::with(['etudiant', 'encadrant'])->findOrFail($id);

        if (! $dossier->avisEncadrant) {
            return response()->json(['message' => 'L\'encadrant n\'a pas encore émis son avis.'], 409);
        }
        if ($dossier->statusStage !== 'valide_encadrant') {
            return response()->json([
                'message' => 'Statut attendu : valide_encadrant. Actuel : ' . $dossier->statusStage,
            ], 409);
        }

        $dossier->update([
            'statusStage'          => 'cloture',
            'dateValidationFinale' => now()->format('Y-m-d'),
        ]);

        $this->notifService->notifier(
            $dossier->etudiant->idCompte,
            $dossier->idDossier,
            'cloture',
            'Stage officiellement clôturé et validé.'
        );

        return response()->json(['message' => 'Stage clôturé.', 'dossier' => $dossier->fresh()]);
    }

    public function archiver(Request $request, int $id)
    {
        $dossier = DossierStage::with(['etudiant'])->findOrFail($id);

        if ($dossier->statusStage !== 'cloture') {
            return response()->json(['message' => 'Seuls les dossiers clôturés peuvent être archivés.'], 409);
        }

        $dossier->update([
            'statusStage'   => 'archive',
            'dateArchivage' => now()->format('Y-m-d'),
        ]);

        return response()->json(['message' => 'Dossier archivé.', 'dossier' => $dossier->fresh()]);
    }

    public function listeEtudiants(Request $request)
    {
        return response()->json(Etudiant::with('dossierStage')->paginate(50));
    }

    public function listeEncadrants(Request $request)
    {
        return response()->json(EncadrantPedagogique::withCount('dossiers')->paginate(50));
    }
}