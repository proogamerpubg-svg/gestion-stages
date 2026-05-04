<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\ModeleDocument;

class ModeleDocumentController extends Controller
{
    // GET /api/admin/modeles-documents
    public function index()
    {
        $types = [
            'convention'            => 'Convention de stage',
            'assurance'             => 'Attestation d\'assurance',
            'lettre_recommandation' => 'Lettre de recommandation',
        ];

        $result = [];
        foreach ($types as $key => $label) {
            $modele = ModeleDocument::where('typeDocument', $key)->first();
            $result[] = [
                'typeDocument' => $key,
                'label'        => $label,
                'disponible'   => $modele !== null,
                'nomFichier'   => $modele?->nomFichier,
                'updatedAt'    => $modele?->updatedAt,
                'idCompte'     => $modele?->idCompte,
            ];
        }

        return response()->json(['modeles' => $result]);
    }

    // POST /api/admin/modeles-documents/upload
    public function upload(Request $request)
    {
        $request->validate([
            'typeDocument' => 'required|in:convention,assurance,lettre_recommandation',
            'fichier'      => 'required|file|mimes:pdf|max:10240',
        ]);

        $type     = $request->typeDocument;
        $file     = $request->file('fichier');
        $idCompte = $request->user()->idCompte; // admin connecté

        $noms = [
            'convention'            => 'modele_convention.pdf',
            'assurance'             => 'modele_assurance.pdf',
            'lettre_recommandation' => 'modele_lettre_recommandation.pdf',
        ];

        $nomFichier = $noms[$type];

        // Supprimer l'ancien fichier si existe
        $ancien = ModeleDocument::where('typeDocument', $type)->first();
        if ($ancien && Storage::disk('public')->exists($ancien->cheminFichier)) {
            Storage::disk('public')->delete($ancien->cheminFichier);
        }

        $chemin = $file->storeAs('modeles', $nomFichier, 'public');

        ModeleDocument::updateOrCreate(
            ['typeDocument' => $type],
            [
                'nomFichier'    => $nomFichier,
                'cheminFichier' => $chemin,
                'idCompte'      => $idCompte,
            ]
        );

        return response()->json([
            'message' => 'Modèle "' . $nomFichier . '" mis à jour avec succès.',
        ]);
    }
}