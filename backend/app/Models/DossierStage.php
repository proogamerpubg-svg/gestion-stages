<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DossierStage extends Model
{
    protected $table      = 'dossierstage';
    protected $primaryKey = 'idDossier';
    public $timestamps    = false;

    // 10 statuts officiels
    const STATUS_DECLARE          = 'declare';
    const STATUS_EN_ATTENTE_ADMIN = 'en_attente_admin';
    const STATUS_REJETE           = 'rejete';
    const STATUS_EN_COURS         = 'en_cours';
    const STATUS_JOURNAL_MI       = 'journal_mi';
    const STATUS_JOURNAL_FIN      = 'journal_fin';
    const STATUS_CLOTURE_DEPOSEE  = 'cloture_deposee';
    const STATUS_VALIDE_ENCADRANT = 'valide_encadrant';
    const STATUS_CLOTURE          = 'cloture';
    const STATUS_ARCHIVE          = 'archive';

    // Types de correction (nouveau champ)
    const CORRECTION_INFOS      = 'infos';      // correction des infos de déclaration
    const CORRECTION_DOCUMENTS  = 'documents';  // re-dépôt de documents

    protected $fillable = [
        'idEtudiant',
        'idEncadrant',
        'idStage',
        'dateDebut',
        'dateFin',
        'statusStage',
        'anneeUniversitaire',
        'mission1',
        'mission2',
        'reponseMission1',
        'reponseMission2',
        'avisEncadrant',
        'motifRejet',
        'typeCorrection',      // NOUVEAU
        'dateValidation',
        'dateValidationFinale',
        'dateArchivage',
    ];

    public function etudiant()
    {
        return $this->belongsTo(Etudiant::class, 'idEtudiant', 'idEtudiant');
    }

    public function encadrant()
    {
        return $this->belongsTo(EncadrantPedagogique::class, 'idEncadrant', 'idEncadrant');
    }

    public function stage()
    {
        return $this->belongsTo(Stage::class, 'idStage', 'idStage');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'dossierRef', 'idDossier');
    }
}