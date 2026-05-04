<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Compte;
use App\Models\DossierStage;

class SysAdminController extends Controller
{
    // =========================================================================
    // GESTION DES COMPTES (Sys_Admin uniquement — Doc v3 Partie 3, point 16)
    // =========================================================================

    /**
     * Liste tous les comptes utilisateurs avec leurs relations.
     */
    public function listeComptes(Request $request)
    {
        $comptes = Compte::with(['etudiant', 'encadrant'])
            ->orderBy('role')
            ->paginate(50);

        return response()->json($comptes);
    }

    /**
     * Créer un nouveau compte utilisateur.
     *
     * CORRECTION BUG #3 : Ajout du champ nomComplet.
     * Doc v3 Partie 4, point 21 :
     *   Les rôles admin, sys_admin et directeur nécessitent nomComplet
     *   pour la bannière de bienvenue personnalisée.
     *   Champ obligatoire pour ces rôles, optionnel pour étudiant/encadrant
     *   (qui ont leur propre table avec nomComplet).
     */
    public function creerCompte(Request $request)
    {
        $request->validate([
            'login'       => 'required|email|unique:compte,login',
            'motDePasse'  => 'required|string|min:6',
            'role'        => 'required|in:etudiant,encadrant,admin,sys_admin,directeur',
            // AJOUTÉ BUG #3 : nomComplet requis pour admin, sys_admin, directeur
            'nomComplet'  => 'required_if:role,admin|required_if:role,sys_admin|required_if:role,directeur|nullable|string|max:150',
        ]);

        $compte = Compte::create([
            'login'      => $request->login,
            'motDePasse' => Hash::make($request->motDePasse),
            'role'       => $request->role,
            'nomComplet' => $request->nomComplet ?? null, // AJOUTÉ BUG #3
        ]);

        return response()->json([
            'message' => 'Compte créé avec succès.',
            'compte'  => $compte,
        ], 201);
    }

    /**
     * Modifier un compte utilisateur existant.
     *
     * CORRECTION BUG #4 : Ajout du champ nomComplet modifiable.
     */
    public function modifierCompte(Request $request, int $id)
    {
        $compte = Compte::findOrFail($id);

        $request->validate([
            'login'      => 'sometimes|email|unique:compte,login,' . $id . ',idCompte',
            'motDePasse' => 'sometimes|string|min:6',
            'role'       => 'sometimes|in:etudiant,encadrant,admin,sys_admin,directeur',
            'nomComplet' => 'sometimes|nullable|string|max:150', // AJOUTÉ BUG #4
        ]);

        $data = $request->only(['login', 'role', 'nomComplet']); // AJOUTÉ nomComplet

        if ($request->filled('motDePasse')) {
            $data['motDePasse'] = Hash::make($request->motDePasse);
        }

        $compte->update($data);

        return response()->json([
            'message' => 'Compte modifié avec succès.',
            'compte'  => $compte->fresh(),
        ]);
    }

    /**
     * Supprimer un compte utilisateur.
     * Sécurité : impossible de supprimer son propre compte.
     * Révocation des tokens Sanctum avant suppression.
     */
    public function supprimerCompte(Request $request, int $id)
    {
        $compte = Compte::findOrFail($id);

        if ($compte->idCompte === $request->user()->idCompte) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 403);
        }

        $compte->tokens()->delete(); // Révoquer tous les tokens Sanctum
        $compte->delete();

        return response()->json(['message' => 'Compte supprimé avec succès.']);
    }

    /**
     * Changer le rôle d'un utilisateur.
     */
    public function changerRole(Request $request, int $id)
    {
        $request->validate([
            'role' => 'required|in:etudiant,encadrant,admin,sys_admin,directeur',
        ]);

        $compte = Compte::findOrFail($id);
        $compte->update(['role' => $request->role]);

        return response()->json([
            'message' => 'Rôle modifié en : ' . $request->role,
            'compte'  => $compte->fresh(),
        ]);
    }

    // =========================================================================
    // OUTILS D'URGENCE (Sys_Admin uniquement)
    // =========================================================================

    /**
     * Débloquer un dossier bloqué (intervention d'urgence sys_admin).
     * Remet le dossier en attente de validation admin pour permettre de reprendre.
     *
     * CORRECTION BUG #1 : Statut correct = 'en_attente_admin' (pas 'en_attente_validation').
     */
    public function debloquerDossier(Request $request, int $id)
    {
        $request->validate([
            'motif' => 'required|string|min:10',
        ]);

        $dossier      = DossierStage::findOrFail($id);
        $ancienStatut = $dossier->statusStage;

        // CORRECTION BUG #1 : valeur correcte 'en_attente_admin'
        $dossier->update([
            'statusStage' => DossierStage::STATUS_EN_ATTENTE_ADMIN,
            'motifRejet'  => 'Déblocage sys_admin : ' . $request->motif,
        ]);

        Log::info("Dossier #{$id} débloqué par sys_admin #{$request->user()->idCompte}. Ancien statut : {$ancienStatut}. Motif : {$request->motif}");

        return response()->json([
            'message'      => 'Dossier débloqué. Nouveau statut : en_attente_admin.', // CORRIGÉ BUG #1
            'ancienStatut' => $ancienStatut,
            'dossier'      => $dossier->fresh(),
        ]);
    }

    /**
     * Forcer le statut d'un dossier (intervention technique uniquement).
     *
     * CORRECTION BUG #2 : Liste des valeurs de statut corrigée selon Doc v3 Partie 6.
     *   Supprimés : documents_deposes, en_attente_validation, journal_mi_stage,
     *               journal_fin_stage, documents_cloture_deposes
     *   Corrigés  : en_attente_admin, journal_mi, journal_fin, cloture_deposee
     *   Ajouté    : valide_encadrant
     */
    public function forcerStatut(Request $request, int $id)
    {
        $request->validate([
            // CORRECTION BUG #2 : valeurs officielles Doc v3 Partie 6
            'statusStage' => 'required|in:declare,en_attente_admin,rejete,en_cours,journal_mi,journal_fin,cloture_deposee,valide_encadrant,cloture,archive',
            'motif'       => 'required|string',
        ]);

        $dossier      = DossierStage::findOrFail($id);
        $ancienStatut = $dossier->statusStage;

        $dossier->update(['statusStage' => $request->statusStage]);

        Log::warning("Statut forcé sur dossier #{$id} par sys_admin #{$request->user()->idCompte}. {$ancienStatut} → {$request->statusStage}. Motif : {$request->motif}");

        return response()->json([
            'message'      => 'Statut mis à jour : ' . $ancienStatut . ' → ' . $request->statusStage,
            'ancienStatut' => $ancienStatut,
            'dossier'      => $dossier->fresh(),
        ]);
    }

    // =========================================================================
    // LOGS SYSTÈME
    // =========================================================================

    /**
     * Consulter les logs système récents (100 dernières lignes).
     */
    public function logs(Request $request)
    {
        $logPath = storage_path('logs/laravel.log');

        if (! file_exists($logPath)) {
            return response()->json(['logs' => 'Aucun log disponible.']);
        }

        $lignes = array_slice(file($logPath), -100);

        return response()->json(['logs' => implode('', $lignes)]);
    }
}