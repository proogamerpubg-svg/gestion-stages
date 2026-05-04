<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EtudiantController;
use App\Http\Controllers\EncadrantController;
use App\Http\Controllers\StageController;
use App\Http\Controllers\DossierStageController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SysAdminController;
use App\Http\Controllers\ModeleDocumentController;

// ===== ROUTES PUBLIQUES =====
Route::post('/login',           [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/verify-code',     [AuthController::class, 'verifierCode']);
Route::post('/reset-password',  [AuthController::class, 'reinitialiserMotDePasse']);

// Année courante du SERVEUR — utilisée par le frontend pour les dates de stage
// L'étudiant ne peut pas tricher en changeant la date de son navigateur
Route::get('/annee-courante', fn () => response()->json(['annee' => (int) date('Y')]));

// ===== ROUTES PROTÉGÉES =====
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Notifications
    Route::get('/notifications',            [NotificationController::class, 'index']);
    Route::get('/notifications/non-lues',   [NotificationController::class, 'nonLues']);
    Route::post('/notifications/{id}/lire', [NotificationController::class, 'marquerLue']);
    Route::post('/notifications/lire-tout', [NotificationController::class, 'marquerToutesLues']);

    // =========================================================================
    // ÉTUDIANT
    // =========================================================================
    Route::middleware('role:etudiant')->prefix('etudiant')->group(function () {
        Route::get('/profil',             [EtudiantController::class, 'profil']);
        Route::get('/dossier',            [DossierStageController::class, 'monDossier']);
        Route::post('/stage/declarer',    [StageController::class, 'declarer']);
        Route::put('/stage/modifier',     [StageController::class, 'modifier']);
        Route::get('/modeles',            [DocumentController::class, 'listeModeles']);
        Route::get('/modeles/{fichier}',  [DocumentController::class, 'telechargerModele']);
        Route::post('/documents/upload',  [DocumentController::class, 'upload']);
        Route::post('/documents/valider-correction', [DocumentController::class, 'validerCorrection']);
        Route::post('/journal/mi-stage',  [DossierStageController::class, 'saisirJournalMiStage']);
        Route::post('/journal/fin-stage', [DossierStageController::class, 'saisirJournalFinStage']);
        Route::post('/documents/cloture', [DocumentController::class, 'uploadCloture']);
    });

    // =========================================================================
    // ENCADRANT
    // =========================================================================
    Route::middleware('role:encadrant')->prefix('encadrant')->group(function () {
        Route::get('/etudiants',                   [EncadrantController::class, 'mesEtudiants']);
        Route::get('/dossier/{id}',                [EncadrantController::class, 'voirDossier']);
        Route::post('/dossier/{id}/confirmer',     [EncadrantController::class, 'confirmerEncadrement']);
        Route::post('/dossier/{id}/rejeter',       [EncadrantController::class, 'rejeterEncadrement']);
        Route::post('/dossier/{id}/commenter-mi',  [EncadrantController::class, 'commenterMiStage']);
        Route::post('/dossier/{id}/commenter-fin', [EncadrantController::class, 'commenterFinStage']);
        Route::post('/dossier/{id}/avis-final',    [EncadrantController::class, 'avisPedagogique']);
    });

    // =========================================================================
    // ADMIN
    // =========================================================================
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dossiers',                    [AdminController::class, 'listeDossiers']);
        Route::get('/dossiers/archives',           [AdminController::class, 'dossierArchives']);
        Route::get('/dossier/{id}',                [AdminController::class, 'voirDossier']);
        Route::post('/import-excel',               [ImportController::class, 'importerExcel']);
        Route::post('/dossier/{id}/valider',       [AdminController::class, 'valider']);
        Route::post('/dossier/{id}/rejeter',       [AdminController::class, 'rejeter']);
        Route::post('/dossier/{id}/valider-final', [AdminController::class, 'validerFinal']);
        Route::post('/dossier/{id}/archiver',      [AdminController::class, 'archiver']);
        Route::get('/etudiants',                   [AdminController::class, 'listeEtudiants']);
        Route::get('/encadrants',                  [AdminController::class, 'listeEncadrants']);
        Route::get('/modeles-documents',           [ModeleDocumentController::class, 'index']);
        Route::post('/modeles-documents/upload',   [ModeleDocumentController::class, 'upload']);
    });

    // =========================================================================
    // SYS_ADMIN
    // =========================================================================
    Route::middleware('role:sys_admin')->prefix('sysadmin')->group(function () {
        Route::get('/comptes',                    [SysAdminController::class, 'listeComptes']);
        Route::post('/comptes',                   [SysAdminController::class, 'creerCompte']);
        Route::put('/comptes/{id}',               [SysAdminController::class, 'modifierCompte']);
        Route::delete('/comptes/{id}',            [SysAdminController::class, 'supprimerCompte']);
        Route::post('/comptes/{id}/changer-role', [SysAdminController::class, 'changerRole']);
        Route::post('/import-excel',              [ImportController::class, 'importerExcel']);
        Route::post('/dossier/{id}/debloquer',    [SysAdminController::class, 'debloquerDossier']);
        Route::put('/dossier/{id}/statut',        [SysAdminController::class, 'forcerStatut']);
        Route::get('/logs',                       [SysAdminController::class, 'logs']);
    });

    // =========================================================================
    // DIRECTEUR — Lecture seule
    // =========================================================================
    Route::middleware('role:directeur')->prefix('directeur')->group(function () {
        Route::get('/dossiers',     [AdminController::class, 'listeDossiers']);
        Route::get('/etudiants',    [AdminController::class, 'listeEtudiants']);
        Route::get('/encadrants',   [AdminController::class, 'listeEncadrants']);
        Route::get('/dossier/{id}', [AdminController::class, 'voirDossier']);
    });
});