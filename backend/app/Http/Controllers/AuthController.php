<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Compte;
use App\Models\Etudiant;
use App\Models\EncadrantPedagogique;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login'      => 'required|string',
            'motDePasse' => 'required|string',
        ]);

        $compte = Compte::where('login', $request->login)->first();

        // Message différent selon ce qui est incorrect : email ou mot de passe
        if (! $compte) {
            return response()->json([
                'message' => 'Adresse email introuvable. Vérifiez votre email.',
                'champ'   => 'email',
            ], 401);
        }

        if (! Hash::check($request->motDePasse, $compte->motDePasse)) {
            return response()->json([
                'message' => 'Mot de passe incorrect. Veuillez réessayer.',
                'champ'   => 'password',
            ], 401);
        }

        $compte->tokens()->delete();
        $token  = $compte->createToken('encg-token')->plainTextToken;
        $profil = $this->chargerProfil($compte);

        return response()->json([
            'message' => 'Connexion réussie.',
            'token'   => $token,
            'user'    => [
                'idCompte' => $compte->idCompte,
                'login'    => $compte->login,
                'role'     => $compte->role,
                'profil'   => $profil,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request)
    {
        $compte = $request->user();
        $profil = $this->chargerProfil($compte);

        return response()->json([
            'idCompte' => $compte->idCompte,
            'login'    => $compte->login,
            'role'     => $compte->role,
            'profil'   => $profil,
        ]);
    }

    // =========================================================================
    // ÉTAPE 1 — Demande de réinitialisation : envoyer code par email
    // =========================================================================
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'login' => 'required|email',
        ]);

        $compte = Compte::where('login', $request->login)->first();

        // Erreur claire si email non trouvé dans notre système
        if (! $compte) {
            return response()->json([
                'message' => 'Cette adresse email ne correspond à aucun compte. Vérifiez votre email.',
                'champ'   => 'email',
            ], 422);
        }

        // Générer un code à 6 chiffres
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Stocker le code (expire dans 15 minutes)
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->login],
            [
                'token'      => Hash::make($code),
                'created_at' => now(),
                'expires_at' => now()->addMinutes(15),
            ]
        );

        // Envoyer l'email avec le code
        try {
            $emailBody = "Bonjour,\n\n"
                . "Vous avez demandé la réinitialisation de votre mot de passe sur la plateforme ENCGO Espace Stages.\n\n"
                . "Votre code de vérification est :\n\n"
                . "        {$code}\n\n"
                . "Ce code est valable pendant 15 minutes.\n\n"
                . "Si vous n'avez pas fait cette demande, ignorez cet email.\n\n"
                . "Cordialement,\n"
                . "Administration ENCGO";

            Mail::raw($emailBody, function ($mail) use ($request) {
                $mail->to($request->login)
                     ->subject('[ENCGO Espace Stages] Code de vérification — Réinitialisation mot de passe');
            });
        } catch (\Exception $e) {
            Log::error('Erreur envoi email reset : ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Un code de vérification a été envoyé à votre adresse email.',
        ]);
    }

    // =========================================================================
    // ÉTAPE 2 — Vérifier le code
    // =========================================================================
    public function verifierCode(Request $request)
    {
        $request->validate([
            'login' => 'required|email',
            'code'  => 'required|string|size:6',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->login)
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Aucune demande de réinitialisation trouvée.'], 422);
        }

        if (now()->isAfter($record->expires_at)) {
            DB::table('password_reset_tokens')->where('email', $request->login)->delete();
            return response()->json(['message' => 'Le code a expiré. Veuillez faire une nouvelle demande.'], 422);
        }

        if (! Hash::check($request->code, $record->token)) {
            return response()->json(['message' => 'Code incorrect. Vérifiez votre email.'], 422);
        }

        return response()->json([
            'message' => 'Code vérifié avec succès.',
            'valide'  => true,
        ]);
    }

    // =========================================================================
    // ÉTAPE 3 — Réinitialiser le mot de passe
    // =========================================================================
    public function reinitialiserMotDePasse(Request $request)
    {
        $request->validate([
            'login'           => 'required|email',
            'code'            => 'required|string|size:6',
            'nouveauMotDePasse'       => 'required|string|min:6',
            'confirmation'    => 'required|same:nouveauMotDePasse',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->login)
            ->first();

        if (! $record || now()->isAfter($record->expires_at) || ! Hash::check($request->code, $record->token)) {
            return response()->json(['message' => 'Code invalide ou expiré.'], 422);
        }

        $compte = Compte::where('login', $request->login)->first();
        if (! $compte) {
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        $compte->motDePasse = Hash::make($request->nouveauMotDePasse);
        $compte->save();

        // Supprimer le token utilisé
        DB::table('password_reset_tokens')->where('email', $request->login)->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        ]);
    }

    private function chargerProfil(Compte $compte): ?array
    {
        switch ($compte->role) {
            case 'etudiant':
                $etudiant = Etudiant::where('idCompte', $compte->idCompte)->first();
                return $etudiant ? $etudiant->toArray() : null;

            case 'encadrant':
                $encadrant = EncadrantPedagogique::where('idCompte', $compte->idCompte)->first();
                return $encadrant ? $encadrant->toArray() : null;

            case 'admin':
            case 'sys_admin':
            case 'directeur':
                return [
                    'nomComplet' => $compte->nomComplet ?? $compte->login,
                    'role'       => $compte->role,
                ];

            default:
                return null;
        }
    }
}