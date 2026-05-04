<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stage extends Model
{
    protected $table      = 'stage';
    protected $primaryKey = 'idStage';
    public $timestamps    = false;

    /**
     * Les 5 champs de documents PDF sont stockés directement dans cette table
     * conformément au SQL fourni et au dictionnaire de données DD.docx.
     *
     * Phase préalable : convention, assurance, lettreRecommandation
     * Phase clôture   : attestation, rapport
     */
    protected $fillable = [
        'sujetStage',
        'periode',
        'type',
        'rapport',
        'attestation',
        'convention',
        'lettreRecommandation',
        'assurance',
        'idOrganisme',
    ];

    public function organisme()
    {
        return $this->belongsTo(OrganismeAccueil::class, 'idOrganisme', 'idOrganisme');
    }

    public function dossierStage()
    {
        return $this->hasOne(DossierStage::class, 'idStage', 'idStage');
    }
}
