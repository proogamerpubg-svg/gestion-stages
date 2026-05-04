<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Classe d'import Excel utilisée par Maatwebsite/Excel.
 * Retourne les données brutes sous forme de tableau.
 */
class EtudiantsImport implements ToArray
{
    public function array(array $array): array
    {
        return $array;
    }
}
