<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inscription extends Model
{
    protected $table   = 'inscription';
    public $timestamps = false;

    protected $fillable = [
        'idEtudiant',
        'idSemestre',
        'anneeUniversitaire',
    ];

    public function etudiant()
    {
        return $this->belongsTo(Etudiant::class, 'idEtudiant', 'idEtudiant');
    }

    public function semestre()
    {
        return $this->belongsTo(Semestre::class, 'idSemestre', 'idSemestre');
    }
}