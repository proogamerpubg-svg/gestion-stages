<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Compte extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table      = 'compte';
    protected $primaryKey = 'idCompte';
    public $timestamps    = false;

    protected $fillable = [
        'login',
        'motDePasse',
        'role',
    ];

    protected $hidden = [
        'motDePasse',
    ];

    /**
     * Sanctum utilise getAuthPassword() pour comparer le hash.
     */
    public function getAuthPassword(): string
    {
        return $this->motDePasse;
    }

    // Relations
    public function etudiant()
    {
        return $this->hasOne(Etudiant::class, 'idCompte', 'idCompte');
    }

    public function encadrant()
    {
        return $this->hasOne(EncadrantPedagogique::class, 'idCompte', 'idCompte');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'idCompte', 'idCompte');
    }
}
