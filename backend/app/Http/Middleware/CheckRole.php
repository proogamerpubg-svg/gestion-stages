<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Vérifie que l'utilisateur connecté a le rôle requis pour accéder à la route.
     *
     * Rôles disponibles dans le système :
     *   - etudiant
     *   - encadrant
     *   - admin
     *   - sys_admin
     *   - directeur
     *
     * Règle RBAC (Doc v3 Partie 3, point 17) :
     *   sys_admin = admin + gestion comptes.
     *   Il n'a PAS accès aux routes étudiant ou encadrant.
     *   Le bypass total sys_admin est donc incorrect — corrigé ci-dessous.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Vérification que l'utilisateur est bien authentifié
        if (! $request->user()) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $compte          = $request->user();
        $roleUtilisateur = $compte->role ?? null;

        // CORRECTION BUG #2 : Guard défensif si le rôle est null ou vide
        if (empty($roleUtilisateur)) {
            return response()->json(['message' => 'Rôle utilisateur non défini.'], 403);
        }

        // CORRECTION BUG #1 : sys_admin ne bypass plus TOUT.
        // Il accède aux routes qui autorisent explicitement 'admin' ou 'sys_admin'.
        // Il ne peut PAS accéder aux routes etudiant ou encadrant.
        //
        // Exemple dans api.php :
        //   role:admin,sys_admin  → sys_admin autorisé ✅
        //   role:etudiant         → sys_admin refusé   ❌ (correct)
        //   role:encadrant        → sys_admin refusé   ❌ (correct)
        //   role:sys_admin        → sys_admin autorisé ✅
        //
        // Le sys_admin bypass uniquement si la liste des rôles autorisés
        // contient 'admin' ou 'sys_admin' (routes de gestion).
        if ($roleUtilisateur === 'sys_admin') {
            $routesAutoriseesSysAdmin = ['admin', 'sys_admin'];
            $intersection = array_intersect($roles, $routesAutoriseesSysAdmin);

            if (! empty($intersection)) {
                return $next($request); // sys_admin autorisé sur les routes admin/sys_admin
            }

            // sys_admin n'a PAS accès aux routes etudiant, encadrant ou directeur
            return response()->json([
                'message' => 'Accès refusé. Le rôle sys_admin ne peut pas accéder à cette ressource.',
            ], 403);
        }

        // Vérification standard pour tous les autres rôles
        if (! in_array($roleUtilisateur, $roles)) {
            return response()->json([
                'message' => 'Accès refusé.',
            ], 403);
        }

        return $next($request);
    }
}