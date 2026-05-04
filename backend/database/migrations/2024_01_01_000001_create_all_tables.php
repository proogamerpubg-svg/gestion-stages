<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. compte ──────────────────────────────────────────
        Schema::create('compte', function (Blueprint $table) {
            $table->increments('idCompte');
            $table->string('login', 100)->unique()->nullable();
            $table->string('motDePasse', 255)->nullable();
            $table->string('role', 50)->nullable();
            $table->string('nomComplet', 150)->nullable(); // pour admin/sys_admin/directeur
        });

        // ── 2. personal_access_tokens (Sanctum) ───────────────
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

       // ── 3. etudiant ────────────────────────────────────────
        Schema::create('etudiant', function (Blueprint $table) {
            $table->increments('idEtudiant');
            $table->string('nomComplet', 100)->nullable();
            $table->string('emailInstitutionnel', 100)->nullable();
            $table->string('numApogee', 20)->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('CNE', 20)->nullable();
            $table->string('CIN', 20)->nullable();   // ← CIN (pas CNI)
            $table->string('niveau', 50)->default('3A');
            $table->unsignedInteger('idCompte')->nullable();
        });

        // ── 4. encadrantpedagogique ────────────────────────────
        Schema::create('encadrantpedagogique', function (Blueprint $table) {
            $table->increments('idEncadrant');
            $table->string('nomComplet', 100)->nullable();
            $table->string('emailInstitutionnel', 100)->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('departement', 100)->nullable();
            $table->string('filiere', 100)->nullable();
            $table->unsignedInteger('idCompte')->nullable();
        });

        // ── 5. organismeaccueil ────────────────────────────────
        Schema::create('organismeaccueil', function (Blueprint $table) {
            $table->increments('idOrganisme');
            $table->string('raisonSociale', 150)->nullable();
            $table->string('adresse', 255)->nullable();
            $table->enum('type', ['public', 'prive'])->nullable(); // PUBLIC ou PRIVÉ
            $table->string('secteur', 100)->nullable();
            $table->string('nomCompletResponsable', 100)->nullable();
            $table->string('telephoneResponsable', 20)->nullable();
            $table->string('emailResponsable', 100)->nullable();
        });

        // ── 6. stage ───────────────────────────────────────────
        Schema::create('stage', function (Blueprint $table) {
            $table->increments('idStage');
            $table->text('sujetStage')->nullable();
            $table->string('periode', 100)->nullable();
            $table->string('type', 100)->nullable(); // type de stage : Initiation
            $table->string('convention', 255)->nullable();
            $table->string('assurance', 255)->nullable();
            $table->string('lettreRecommandation', 255)->nullable();
            $table->string('attestation', 255)->nullable();
            $table->string('rapport', 255)->nullable();
            $table->unsignedInteger('idOrganisme')->nullable();
        });

        // ── 7. dossierstage ────────────────────────────────────
        Schema::create('dossierstage', function (Blueprint $table) {
            $table->increments('idDossier');
            $table->unsignedInteger('idEtudiant')->nullable();
            $table->unsignedInteger('idEncadrant')->nullable();
            $table->unsignedInteger('idStage')->nullable();
            $table->date('dateDebut')->nullable();
            $table->date('dateFin')->nullable();
            $table->string('statusStage', 50)->nullable();
            $table->string('anneeUniversitaire', 20)->nullable();
            $table->text('mission1')->nullable();         // journal mi-stage étudiant
            $table->text('mission2')->nullable();         // journal fin de stage étudiant
            $table->text('reponseMission1')->nullable();  // commentaire encadrant mi-stage
            $table->text('reponseMission2')->nullable();  // commentaire encadrant fin de stage
            // observationEncadrant1 et observationEncadrant2 SUPPRIMÉS — doublons
            $table->text('avisEncadrant')->nullable();   // avis pédagogique final encadrant
            $table->text('motifRejet')->nullable();       // motif rejet + type de correction
            $table->string('typeCorrection', 50)->nullable(); // NOUVEAU : 'infos' ou 'documents'
            $table->date('dateValidation')->nullable();
            $table->date('dateValidationFinale')->nullable();
            $table->date('dateArchivage')->nullable();
        });

        // ── 8. semestre ────────────────────────────────────────
        // Gardé pour les statistiques futures (stage 4A, 5A)
        Schema::create('semestre', function (Blueprint $table) {
            $table->increments('idSemestre');
            $table->string('nomSemestre', 50)->nullable();
            $table->string('filire', 100)->nullable();
        });

        // ── 9. inscription ─────────────────────────────────────
        // Gardé pour les statistiques futures
        Schema::create('inscription', function (Blueprint $table) {
            $table->unsignedInteger('idEtudiant');
            $table->unsignedInteger('idSemestre');
            $table->string('anneeUniversitaire', 20);
            $table->primary(['idEtudiant', 'idSemestre', 'anneeUniversitaire']);
        });

        // ── 10. notification ───────────────────────────────────
        Schema::create('notification', function (Blueprint $table) {
            $table->increments('idNotification');
            $table->unsignedInteger('idCompte');
            $table->unsignedInteger('dossierRef')->nullable();
            $table->text('message');
            $table->string('type', 100);
            $table->tinyInteger('lu')->default(0);
            $table->dateTime('createdAt')->useCurrent();
        });

        // ── 11. password_reset_tokens ──────────────────────────
        // NOUVEAU : pour la réinitialisation du mot de passe par email
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token', 64)->unique();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('expires_at'); // expire après 15 minutes
        });

        // ── 12. ModeleDocument ────────────────────────────────
        Schema::create('ModeleDocument', function (Blueprint $table) {
            $table->increments('idModele');
            $table->enum('typeDocument', ['convention', 'assurance', 'lettre_recommandation'])->unique();
            $table->string('nomFichier', 255);
            $table->string('cheminFichier', 255);
            $table->unsignedInteger('idCompte')->nullable();
            $table->timestamp('updatedAt')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        // ── FK après création de toutes les tables ─────────────
        Schema::table('etudiant', function (Blueprint $table) {
            $table->foreign('idCompte')->references('idCompte')->on('compte')->onDelete('set null');
        });
        Schema::table('encadrantpedagogique', function (Blueprint $table) {
            $table->foreign('idCompte')->references('idCompte')->on('compte')->onDelete('set null');
        });
        Schema::table('stage', function (Blueprint $table) {
            $table->foreign('idOrganisme')->references('idOrganisme')->on('organismeaccueil')->onDelete('set null');
        });
        Schema::table('dossierstage', function (Blueprint $table) {
            $table->foreign('idEtudiant')->references('idEtudiant')->on('etudiant')->onDelete('cascade');
            $table->foreign('idEncadrant')->references('idEncadrant')->on('encadrantpedagogique')->onDelete('set null');
            $table->foreign('idStage')->references('idStage')->on('stage')->onDelete('set null');
        });
        Schema::table('inscription', function (Blueprint $table) {
            $table->foreign('idEtudiant')->references('idEtudiant')->on('etudiant')->onDelete('cascade');
            $table->foreign('idSemestre')->references('idSemestre')->on('semestre')->onDelete('cascade');
        });
        Schema::table('notification', function (Blueprint $table) {
            $table->foreign('idCompte')->references('idCompte')->on('compte')->onDelete('cascade');
        });
        Schema::table('ModeleDocument', function (Blueprint $table) {
            $table->foreign('idCompte')->references('idCompte')->on('compte')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('ModeleDocument');
        Schema::dropIfExists('notification');
        Schema::dropIfExists('inscription');
        Schema::dropIfExists('semestre');
        Schema::dropIfExists('dossierstage');
        Schema::dropIfExists('stage');
        Schema::dropIfExists('organismeaccueil');
        Schema::dropIfExists('encadrantpedagogique');
        Schema::dropIfExists('etudiant');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('compte');
        Schema::dropIfExists('password_reset_tokens');
    }
};