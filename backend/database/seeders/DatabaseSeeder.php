<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Compte;
use App\Models\Etudiant;
use App\Models\EncadrantPedagogique;
use App\Models\DossierStage;
use App\Models\Semestre;
use App\Models\Inscription;

class DatabaseSeeder extends Seeder
{
    /**
     * Logique semestres ENCGO (5 ans × 2 semestres) :
     *   1ère année → S1, S2
     *   2ème année → S3, S4
     *   3ème année → S5, S6  ← stage initiation = S5
     *   4ème année → S7, S8
     *   5ème année → S9, S10 ← PFE = S9
     */
    private function getSemestre(string $niveau): string
    {
        return match ($niveau) {
            '1A'    => 'S1',
            '2A'    => 'S3',
            '3A'    => 'S5',  // Stage initiation
            '4A'    => 'S7',
            '5A'    => 'S9',  // PFE
            default => 'S5',
        };
    }

    public function run(): void
    {
        // ── Comptes admin / sys_admin / directeur ──────────────
        $comptesAdmin = [
            ['login' => 'admin@encg.ac.ma',     'mdp' => 'admin123',     'role' => 'admin',     'nom' => 'Administrateur ENCGO'],
            ['login' => 'sysadmin@encg.ac.ma',  'mdp' => 'sysadmin123',  'role' => 'sys_admin', 'nom' => 'Administrateur Système'],
            ['login' => 'directeur@encg.ac.ma', 'mdp' => 'directeur123', 'role' => 'directeur', 'nom' => 'Directeur ENCGO'],
        ];

        foreach ($comptesAdmin as $c) {
            Compte::firstOrCreate(
                ['login' => $c['login']],
                [
                    'motDePasse' => Hash::make($c['mdp']),
                    'role'       => $c['role'],
                    'nomComplet' => $c['nom'],
                ]
            );
        }

        // ── Données étudiants/encadrants (format identique à l'import Excel) ──
        $lignes = [
            [
                'nomEtudiant'        => 'Yassine Ait Brahim',
                'emailEtudiant'      => 'etudiant1@encg.ac.ma',
                'numApogee'          => 'APO2024001',
                'CNE'                => 'R143256789',
                'CIN'                => 'BJ123456',
                'telEtudiant'        => '0671234567',
                'niveau'             => '3A',
                'nomEncadrant'       => 'Mohammed Benali',
                'emailEncadrant'     => 'encadrant1@encg.ac.ma',
                'telEncadrant'       => '0661234567',
                'departement'        => 'Informatique de Gestion',
                'filiere'            => 'Management des Systèmes d\'Information',
                'anneeUniversitaire' => '2026-2027',
            ],
            [
                'nomEtudiant'        => 'Salma Karimi',
                'emailEtudiant'      => 'etudiant2@encg.ac.ma',
                'numApogee'          => 'APO2024002',
                'CNE'                => 'R143256790',
                'CIN'                => 'BJ234567',
                'telEtudiant'        => '0672345678',
                'niveau'             => '3A',
                'nomEncadrant'       => 'Mohammed Benali',
                'emailEncadrant'     => 'encadrant1@encg.ac.ma',
                'telEncadrant'       => '0661234567',
                'departement'        => 'Informatique de Gestion',
                'filiere'            => 'Management des Systèmes d\'Information',
                'anneeUniversitaire' => '2026-2027',
            ],
            [
                // Test avec emails réels
                'nomEtudiant'        => 'Étudiant Test',
                'emailEtudiant'      => 'proogamerpubg@gmail.com',
                'numApogee'          => 'APO2024099',
                'CNE'                => 'R999999999',
                'CIN'                => 'BJ999999',
                'telEtudiant'        => '0600000001',
                'niveau'             => '3A',
                'nomEncadrant'       => 'Abdelilah Azzmouri',
                'emailEncadrant'     => 'AzzmouriAbdelilah2003@gmail.com',
                'telEncadrant'       => '0600000000',
                'departement'        => 'Informatique',
                'filiere'            => 'Génie Logiciel',
                'anneeUniversitaire' => '2026-2027',
            ],
        ];

        foreach ($lignes as $ligne) {
            DB::transaction(function () use ($ligne) {

                $niveau     = $ligne['niveau'];
                $annee      = $ligne['anneeUniversitaire'];
                $nomSem     = $this->getSemestre($niveau); // ex: "S5" pour 3A

                // 1. Compte étudiant
                $compteEtudiant = Compte::firstOrCreate(
                    ['login' => $ligne['emailEtudiant']],
                    [
                        'motDePasse' => Hash::make('encg2024'),
                        'role'       => 'etudiant',
                    ]
                );

                // 2. Profil étudiant (CIN pas CNI)
                $etudiant = Etudiant::firstOrCreate(
                    ['emailInstitutionnel' => $ligne['emailEtudiant']],
                    [
                        'nomComplet' => $ligne['nomEtudiant'],
                        'numApogee'  => $ligne['numApogee'],
                        'CNE'        => $ligne['CNE'],
                        'CIN'        => $ligne['CIN'],
                        'telephone'  => $ligne['telEtudiant'],
                        'niveau'     => $niveau,
                        'idCompte'   => $compteEtudiant->idCompte,
                    ]
                );

                // 3. Semestre — nomSemestre = S5, filire = filière
                $semestre = Semestre::firstOrCreate(
                    [
                        'nomSemestre' => $nomSem,
                        'filire'      => $ligne['filiere'],
                    ]
                );

                // 4. Inscription
                Inscription::firstOrCreate(
                    [
                        'idEtudiant'         => $etudiant->idEtudiant,
                        'idSemestre'         => $semestre->idSemestre,
                        'anneeUniversitaire' => $annee,
                    ]
                );

                // 5. Compte encadrant
                $compteEncadrant = Compte::firstOrCreate(
                    ['login' => $ligne['emailEncadrant']],
                    [
                        'motDePasse' => Hash::make('encg2024'),
                        'role'       => 'encadrant',
                    ]
                );

                // 6. Profil encadrant
                $encadrant = EncadrantPedagogique::firstOrCreate(
                    ['emailInstitutionnel' => $ligne['emailEncadrant']],
                    [
                        'nomComplet'  => $ligne['nomEncadrant'],
                        'telephone'   => $ligne['telEncadrant'],
                        'departement' => $ligne['departement'],
                        'filiere'     => $ligne['filiere'],
                        'idCompte'    => $compteEncadrant->idCompte,
                    ]
                );

                // 7. DossierStage pivot
                DossierStage::firstOrCreate(
                    ['idEtudiant' => $etudiant->idEtudiant],
                    [
                        'idEncadrant'        => $encadrant->idEncadrant,
                        'idStage'            => null,
                        'statusStage'        => null,
                        'anneeUniversitaire' => $annee,
                    ]
                );
            });
        }

        $this->command->info('');
        $this->command->info('✅ Base de données initialisée.');
        $this->command->table(
            ['Email', 'Mot de passe', 'Rôle'],
            [
                ['admin@encg.ac.ma',                'admin123',     'admin'],
                ['sysadmin@encg.ac.ma',             'sysadmin123',  'sys_admin'],
                ['directeur@encg.ac.ma',            'directeur123', 'directeur'],
                ['encadrant1@encg.ac.ma',           'encg2024',     'encadrant'],
                ['AzzmouriAbdelilah2003@gmail.com', 'encg2024',     'encadrant (email réel)'],
                ['etudiant1@encg.ac.ma',            'encg2024',     'etudiant'],
                ['etudiant2@encg.ac.ma',            'encg2024',     'etudiant'],
                ['proogamerpubg@gmail.com',         'encg2024',     'etudiant (email réel)'],
            ]
        );
    }
}