<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Models\Notification;
use App\Models\Compte;
use App\Models\DossierStage;

class NotificationService
{
    public function notifier(int $idCompte, int $idDossier, string $type, string $message): void
    {
        // Notification interne UNIQUEMENT — pas d'email (sauf encadrant via notifierEncadrant)
        Notification::create([
            'idCompte'  => $idCompte,
            'dossierRef' => $idDossier,
            'message'   => $message,
            'type'      => $type,
            'lu'        => 0,
            'createdAt' => now(),
        ]);
    }

    /**
     * Email professionnel à l'encadrant lors d'une nouvelle demande d'encadrement.
     * Format officiel ENCGO — conforme au modèle demandé.
     */
    public function notifierEncadrant(DossierStage $dossier): void
    {
        $encadrant = $dossier->encadrant;
        $etudiant  = $dossier->etudiant;

        if (! $encadrant || ! $etudiant) {
            return;
        }

        // Récupérer la filière depuis l'inscription
        $inscription = $etudiant->inscriptions()->with('semestre')->first();
        $filiere     = $inscription?->semestre?->filire ?? '3ème Année';
        $annee       = $dossier->anneeUniversitaire ?? date('Y') . '-' . (date('Y') + 1);

        // ── Notification interne (dans l'application) ──
        $messageInterne = "Nouvelle demande d'encadrement de l'étudiant(e) {$etudiant->nomComplet}. "
            . "Veuillez consulter leur dossier.";

        Notification::create([
            'idCompte'  => $encadrant->idCompte,
            'dossierRef' => $dossier->idDossier,
            'message'   => $messageInterne,
            'type'      => 'nouveau_dossier',
            'lu'        => 0,
            'createdAt' => now(),
        ]);

        // ── Email professionnel format ENCGO officiel (format exact demandé) ──
        $sujet = "Demande d'encadrement de {$etudiant->nomComplet}";

        $emailBody = "Objet : Demande d'encadrement de {$etudiant->nomComplet}\n\n"
            . "Bonjour {$encadrant->nomComplet},\n\n"
            . "L'étudiant(e) {$etudiant->nomComplet}, inscrit(e) en {$filiere} / 3ème Année, "
            . "a soumis une demande d'encadrement pour son stage d'initiation.\n\n"
            . "Vous êtes invité(e) à consulter le dossier de l'étudiant et à confirmer "
            . "votre accord pour assurer son encadrement. Vous pouvez accéder au dossier "
            . "via la plateforme ENCGO Espace Stages : http://localhost:3000\n\n"
            . "Important : En l'absence de feed-back dans un délai de 24 heures, "
            . "l'affectation sera considérée comme définitive.\n\n"
            . "Nous vous remercions de votre collaboration.\n\n"
            . "Cordialement,\n"
            . "Administration";

        // Envoyer l'email
        $compteEncadrant = Compte::find($encadrant->idCompte);
        if ($compteEncadrant && filter_var($compteEncadrant->login, FILTER_VALIDATE_EMAIL)) {
            try {
                Mail::raw($emailBody, function ($mail) use ($compteEncadrant, $sujet) {
                    $mail->to($compteEncadrant->login)
                         ->subject($sujet);
                });
            } catch (\Exception $e) {
                Log::error('Erreur envoi email encadrant : ' . $e->getMessage());
            }
        }
    }

    public function notifierAdmin(int $idDossier, string $type, string $message): void
    {
        $admins = Compte::whereIn('role', ['admin'])->get();
        foreach ($admins as $admin) {
            $this->notifier($admin->idCompte, $idDossier, $type, $message);
        }
    }

    private function envoyerEmail(string $destinataire, string $type, string $message): void
    {
        try {
            $sujet = $this->getSujetParType($type);
            Mail::raw($message, function ($mail) use ($destinataire, $sujet) {
                $mail->to($destinataire)
                     ->subject('[ENCGO Espace Stages] ' . $sujet);
            });
        } catch (\Exception $e) {
            Log::error('Erreur envoi email : ' . $e->getMessage());
        }
    }

    private function getSujetParType(string $type): string
    {
        return match ($type) {
            'validation'      => 'Dossier validé',
            'rejet'           => 'Dossier rejeté — Action requise',
            'journal'         => 'Nouveau journal de stage',
            'observation'     => 'Observation de votre encadrant',
            'cloture'         => 'Stage clôturé avec succès',
            'nouveau_dossier' => 'Nouvelle demande d\'encadrement',
            'avis_final'      => 'Avis final émis',
            default           => 'Notification — ENCGO Espace Stages',
        };
    }
}