<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app'     => 'ENCG Gestion Stages API',
        'version' => '1.0',
        'statut'  => 'opérationnel',
    ]);
});
