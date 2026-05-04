<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModeleDocument extends Model
{
    protected $table      = 'modeledocument';
    protected $primaryKey = 'idModele';

    const CREATED_AT = null;
    const UPDATED_AT = 'updatedAt';

    public $timestamps = true;

    protected $fillable = [
        'typeDocument',
        'nomFichier',
        'cheminFichier',
        'idCompte',
    ];

    public function compte()
    {
        return $this->belongsTo(Compte::class, 'idCompte', 'idCompte');
    }
}