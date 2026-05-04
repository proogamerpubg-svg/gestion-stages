<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\EtudiantsImport;
use App\Models\Compte;
use App\Models\Etudiant;
use App\Models\EncadrantPedagogique;
use App\Models\DossierStage;
use App\Models\Semestre;
use App\Models\Inscription;

class ImportController extends Controller
{
    /**
     * Colonnes Excel :
     * A[0]  nomComplet étudiant
     * B[1]  emailEtudiant
     * C[2]  numApogee
     * D[3]  CNE
     * E[4]  telephone étudiant
     * F[5]  niveau (ex: 3A)
     * G[6]  nomEncadrant
     * H[7]  emailEncadrant
     * I[8]  telephoneEncadrant
     * J[9]  departement
     * K[10] filiere
     * L[11] anneeUniversitaire
     * M[12] CIN (Carte d'identité nationale — optionnel)
     */
    public function importerExcel(Request $request)
    {
        $request->validate([
            'fichier' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        try {
            $resultats = Excel::toArray(new EtudiantsImport(), $request->fichier);
            $lignes    = $resultats[0] ?? [];

            if (empty($lignes)) {
                return response()->json(['message' => 'Le fichier Excel est vide.'], 422);
            }

            $compteurs = ['crees' => 0, 'ignores' => 0, 'erreurs' => []];

            foreach ($lignes as $index => $ligne) {
                if ($index === 0 && str_contains(strtolower((string)($ligne[0] ?? '')), 'nom')) {
                    continue;
                }
                try {
                    DB::transaction(function () use ($ligne, &$compteurs) {
                        $this->traiterLigne($ligne, $compteurs);
                    });
                } catch (\Exception $e) {
                    $compteurs['erreurs'][] = 'Ligne ' . ($index + 1) . ' : ' . $e->getMessage();
                }
            }

            return response()->json([
                'message' => 'Import terminé.',
                'crees'   => $compteurs['crees'],
                'ignores' => $compteurs['ignores'],
                'erreurs' => $compteurs['erreurs'],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de l\'import : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Logique semestres ENCGO :
     * 1A→S1, 2A→S3, 3A→S5 (stage initiation), 4A→S7, 5A→S9 (PFE)
     */
    private function getSemestre(string $niveau): string
    {
        return match (strtoupper(trim($niveau))) {
            '1A'    => 'S1',
            '2A'    => 'S3',
            '3A'    => 'S5',
            '4A'    => 'S7',
            '5A'    => 'S9',
            default => 'S5',
        };
    }

    private function traiterLigne(array $ligne, array &$compteurs): void
    {
        $emailEtudiant  = trim((string)($ligne[1] ?? ''));
        $emailEncadrant = trim((string)($ligne[7] ?? ''));
        $niveau         = trim((string)($ligne[5] ?? '3A'));
        $filiere        = trim((string)($ligne[10] ?? '3ème Année'));

        $anneeExcel = trim((string)($ligne[11] ?? ''));
        if (empty($anneeExcel)) {
            $annee      = (int)date('Y');
            $anneeExcel = $annee . '-' . ($annee + 1);
        }
        $anneeExcel = str_replace('/', '-', $anneeExcel);

        if (empty($emailEtudiant) || empty($emailEncadrant)) {
            $compteurs['ignores']++;
            return;
        }

        // 1. Compte étudiant
        $compteEtudiant = Compte::firstOrCreate(
            ['login' => $emailEtudiant],
            ['motDePasse' => Hash::make('encg2024'), 'role' => 'etudiant']
        );

        // 2. Profil étudiant (CIN)
        $etudiant = Etudiant::firstOrCreate(
            ['emailInstitutionnel' => $emailEtudiant],
            [
                'nomComplet' => trim((string)($ligne[0] ?? '')),
                'numApogee'  => trim((string)($ligne[2] ?? '')),
                'CNE'        => trim((string)($ligne[3] ?? '')),
                'CIN'        => trim((string)($ligne[12] ?? '')),  // colonne M (optionnel)
                'telephone'  => trim((string)($ligne[4] ?? '')),
                'niveau'     => $niveau,
                'idCompte'   => $compteEtudiant->idCompte,
            ]
        );

        // 3. Semestre (S5 pour 3A)
        $nomSemestre = $this->getSemestre($niveau);
        $semestre = Semestre::firstOrCreate(
            ['nomSemestre' => $nomSemestre, 'filire' => $filiere]
        );

        // 4. Inscription
        Inscription::firstOrCreate(
            [
                'idEtudiant'         => $etudiant->idEtudiant,
                'idSemestre'         => $semestre->idSemestre,
                'anneeUniversitaire' => $anneeExcel,
            ]
        );

        // 5. Compte encadrant
        $compteEncadrant = Compte::firstOrCreate(
            ['login' => $emailEncadrant],
            ['motDePasse' => Hash::make('encg2024'), 'role' => 'encadrant']
        );

        // 6. Profil encadrant
        $encadrant = EncadrantPedagogique::firstOrCreate(
            ['emailInstitutionnel' => $emailEncadrant],
            [
                'nomComplet'  => trim((string)($ligne[6] ?? '')),
                'telephone'   => trim((string)($ligne[8] ?? '')),
                'departement' => trim((string)($ligne[9] ?? '')),
                'filiere'     => $filiere,
                'idCompte'    => $compteEncadrant->idCompte,
            ]
        );

        // 7. DossierStage
        $dossierExistant = DossierStage::where('idEtudiant', $etudiant->idEtudiant)->first();
        if (! $dossierExistant) {
            DossierStage::create([
                'idEtudiant'         => $etudiant->idEtudiant,
                'idEncadrant'        => $encadrant->idEncadrant,
                'idStage'            => null,
                'statusStage'        => null,
                'anneeUniversitaire' => $anneeExcel,
            ]);
            $compteurs['crees']++;
        } else {
            $compteurs['ignores']++;
        }
    }
}