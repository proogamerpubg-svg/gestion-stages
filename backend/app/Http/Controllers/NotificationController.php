<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $compte   = $request->user();
        $idCompte = $compte->idCompte;

        // sys_admin ne reçoit aucune notification
        if ($compte->role === 'sys_admin') {
            return response()->json(['data' => [], 'nonLues' => 0]);
        }

        $query = Notification::where('idCompte', $idCompte)
            ->orderBy('createdAt', 'desc');

        if ($request->has('lu')) {
            $query->where('lu', (int) $request->lu);
        }

        $notifications = $query->get();

        $countNonLues = Notification::where('idCompte', $idCompte)
            ->where('lu', 0)
            ->count();

        return response()->json([
            'data'    => $notifications,
            'nonLues' => $countNonLues,
        ]);
    }

    public function nonLues(Request $request)
    {
        $compte = $request->user();

        // sys_admin : badge toujours à 0
        if ($compte->role === 'sys_admin') {
            return response()->json(['count' => 0]);
        }

        $count = Notification::where('idCompte', $compte->idCompte)
            ->where('lu', 0)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function marquerLue(Request $request, int $id)
    {
        $notif = Notification::where('idNotification', $id)
            ->where('idCompte', $request->user()->idCompte)
            ->firstOrFail();

        $notif->update(['lu' => 1]);

        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    public function marquerToutesLues(Request $request)
    {
        $count = Notification::where('idCompte', $request->user()->idCompte)
            ->where('lu', 0)
            ->update(['lu' => 1]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues.',
            'updated' => $count,
        ]);
    }
}