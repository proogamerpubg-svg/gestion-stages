<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Etudiant extends Model
{
    protected $table      = 'etudiant';
    protected $primaryKey = 'idEtudiant';
    public $timestamps    = false;

    protected $fillable = [
        'nomComplet',
        'emailInstitutionnel',
        'numApogee',
        'telephone',
        'CNE',
        'CIN',        // ← CIN (pas CNI)
        'niveau',
        'idCompte',
    ];

    public function compte()
    {
        return $this->belongsTo(Compte::class, 'idCompte', 'idCompte');
    }

    public function dossierStage()
    {
        return $this->hasOne(DossierStage::class, 'idEtudiant', 'idEtudiant');
    }

    public function inscriptions()
    {
        return $this->hasMany(Inscription::class, 'idEtudiant', 'idEtudiant');
    }
}