<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganismeAccueil extends Model
{
    protected $table      = 'organismeaccueil';
    protected $primaryKey = 'idOrganisme';
    public $timestamps    = false;

    protected $fillable = [
        'raisonSociale',
        'adresse',
        'type',
        'secteur',
        'nomCompletResponsable',
        'telephoneResponsable',
        'emailResponsable',
    ];

    public function stages()
    {
        return $this->hasMany(Stage::class, 'idOrganisme', 'idOrganisme');
    }
}
