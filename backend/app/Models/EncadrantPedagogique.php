<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EncadrantPedagogique extends Model
{
    protected $table      = 'encadrantpedagogique';
    protected $primaryKey = 'idEncadrant';
    public $timestamps    = false;

    protected $fillable = [
        'nomComplet',
        'emailInstitutionnel',
        'telephone',
        'departement',
        'filiere',
        'idCompte',
    ];

    public function compte()
    {
        return $this->belongsTo(Compte::class, 'idCompte', 'idCompte');
    }

    public function dossiers()
    {
        return $this->hasMany(DossierStage::class, 'idEncadrant', 'idEncadrant');
    }
}
