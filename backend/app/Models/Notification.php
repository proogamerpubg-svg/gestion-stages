<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Table notification créée via migration (absente du SQL initial).
 * Référence : Documentation Technique ENCG v1.0 section 5.5
 */
class Notification extends Model
{
    protected $table      = 'notification';
    protected $primaryKey = 'idNotification';
    public $timestamps    = false;

    protected $fillable = [
        'idCompte',
        'idDossier',
        'message',
        'type',
        'lu',
        'createdAt',
    ];

    protected $casts = [
        'lu'        => 'boolean',
        'createdAt' => 'datetime',
    ];

    public function compte()
    {
        return $this->belongsTo(Compte::class, 'idCompte', 'idCompte');
    }

    public function dossier()
    {
        return $this->belongsTo(DossierStage::class, 'idDossier', 'idDossier');
    }
}
