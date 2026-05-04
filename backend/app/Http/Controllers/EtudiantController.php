<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Etudiant;
use App\Models\DossierStage;

class EtudiantController extends Controller
{
    /**
     * Retourne le profil complet de l'étudiant connecté.
     */
    public function profil(Request $request)
    {
        $compte   = $request->user();
        $etudiant = Etudiant::where('idCompte', $compte->idCompte)->first();

        if (! $etudiant) {
            return response()->json([
                'message' => 'Profil étudiant introuvable. Contactez l\'administration.',
            ], 404);
        }

        $dossier = DossierStage::with(['encadrant', 'stage.organisme'])
            ->where('idEtudiant', $etudiant->idEtudiant)
            ->first();

        return response()->json([
            'etudiant'  => $etudiant,
            'encadrant' => $dossier ? $dossier->encadrant : null,
            'dossier'   => $dossier,
        ]);
    }
}