<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Semestre extends Model
{
    protected $table      = 'semestre';
    protected $primaryKey = 'idSemestre';
    public $timestamps    = false;

    protected $fillable = [
        'nomSemestre',
        'filire',
    ];

    public function inscriptions()
    {
        return $this->hasMany(Inscription::class, 'idSemestre', 'idSemestre');
    }
}