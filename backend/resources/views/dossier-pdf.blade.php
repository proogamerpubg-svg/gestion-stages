<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Dossier de Stage - {{ $dossier->etudiant->nomComplet ?? '' }}</title>
    <style>
        body        { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #222; }
        h1          { color: #003366; font-size: 18px; text-align: center; border-bottom: 2px solid #003366; padding-bottom: 8px; }
        h2          { color: #003366; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; }
        table       { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        td, th      { border: 1px solid #ccc; padding: 6px 10px; }
        th          { background-color: #003366; color: #fff; text-align: left; }
        .badge      { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .valide     { background: #d4edda; color: #155724; }
        .rejete     { background: #f8d7da; color: #721c24; }
        .en-cours   { background: #cce5ff; color: #004085; }
        .footer     { margin-top: 30px; font-size: 10px; color: #888; text-align: center; }
        .section    { margin-bottom: 20px; }
        .label      { font-weight: bold; color: #003366; }
    </style>
</head>
<body>

<h1>ENCG — Dossier de Stage d'Initiation (3A)</h1>
<p style="text-align:center; color:#666;">Généré le {{ now()->format('d/m/Y à H:i') }}</p>

<!-- ÉTUDIANT -->
<h2>1. Informations de l'Étudiant</h2>
<table>
    <tr><th>Champ</th><th>Valeur</th></tr>
    <tr><td class="label">Nom complet</td><td>{{ $dossier->etudiant->nomComplet ?? '—' }}</td></tr>
    <tr><td class="label">CNE</td><td>{{ $dossier->etudiant->CNE ?? '—' }}</td></tr>
    <tr><td class="label">N° Apogée</td><td>{{ $dossier->etudiant->numApogee ?? '—' }}</td></tr>
    <tr><td class="label">Email</td><td>{{ $dossier->etudiant->emailInstitutionnel ?? '—' }}</td></tr>
    <tr><td class="label">Téléphone</td><td>{{ $dossier->etudiant->telephone ?? '—' }}</td></tr>
    <tr><td class="label">Niveau</td><td>{{ $dossier->etudiant->niveau ?? '3A' }}</td></tr>
</table>

<!-- ENCADRANT -->
<h2>2. Encadrant Pédagogique</h2>
<table>
    <tr><th>Champ</th><th>Valeur</th></tr>
    <tr><td class="label">Nom complet</td><td>{{ $dossier->encadrant->nomComplet ?? '—' }}</td></tr>
    <tr><td class="label">Email</td><td>{{ $dossier->encadrant->emailInstitutionnel ?? '—' }}</td></tr>
    <tr><td class="label">Téléphone</td><td>{{ $dossier->encadrant->telephone ?? '—' }}</td></tr>
    <tr><td class="label">Département</td><td>{{ $dossier->encadrant->departement ?? '—' }}</td></tr>
    <tr><td class="label">Filière</td><td>{{ $dossier->encadrant->filiere ?? '—' }}</td></tr>
</table>

<!-- STAGE -->
@if($dossier->stage)
<h2>3. Informations du Stage</h2>
<table>
    <tr><th>Champ</th><th>Valeur</th></tr>
    <tr><td class="label">Sujet</td><td>{{ $dossier->stage->sujetStage ?? '—' }}</td></tr>
    <tr><td class="label">Période</td><td>{{ $dossier->stage->periode ?? '—' }}</td></tr>
    <tr><td class="label">Type</td><td>{{ $dossier->stage->type ?? 'Initiation' }}</td></tr>
    <tr><td class="label">Date début</td><td>{{ $dossier->dateDebut ?? '—' }}</td></tr>
    <tr><td class="label">Date fin</td><td>{{ $dossier->dateFin ?? '—' }}</td></tr>
    <tr><td class="label">Année universitaire</td><td>{{ $dossier->anneeUniversitaire ?? '—' }}</td></tr>
</table>

<!-- ORGANISME -->
@if($dossier->stage->organisme)
<h2>4. Organisme d'Accueil</h2>
<table>
    <tr><th>Champ</th><th>Valeur</th></tr>
    <tr><td class="label">Raison sociale</td><td>{{ $dossier->stage->organisme->raisonSociale ?? '—' }}</td></tr>
    <tr><td class="label">Adresse</td><td>{{ $dossier->stage->organisme->adresse ?? '—' }}</td></tr>
    <tr><td class="label">Secteur</td><td>{{ $dossier->stage->organisme->secteur ?? '—' }}</td></tr>
    <tr><td class="label">Responsable</td><td>{{ $dossier->stage->organisme->nomCompletResponsable ?? '—' }}</td></tr>
    <tr><td class="label">Tél. responsable</td><td>{{ $dossier->stage->organisme->telephoneResponsable ?? '—' }}</td></tr>
    <tr><td class="label">Email responsable</td><td>{{ $dossier->stage->organisme->emailResponsable ?? '—' }}</td></tr>
</table>
@endif
@endif

<!-- JOURNAL DE BORD -->
<h2>5. Journal de Bord</h2>
<div class="section">
    <p><span class="label">Mission 1 :</span> {{ $dossier->mission1 ?? '—' }}</p>
    <p><span class="label">Réponse mi-stage :</span> {{ $dossier->reponseMission1 ?? 'Non saisi' }}</p>
    @if($dossier->observationEncadrant1)
    <p><span class="label">Observation encadrant :</span> {{ $dossier->observationEncadrant1 }}</p>
    @endif

    <p><span class="label">Mission 2 :</span> {{ $dossier->mission2 ?? '—' }}</p>
    <p><span class="label">Réponse fin de stage :</span> {{ $dossier->reponseMission2 ?? 'Non saisi' }}</p>
    @if($dossier->observationEncadrant2)
    <p><span class="label">Observation encadrant :</span> {{ $dossier->observationEncadrant2 }}</p>
    @endif
</div>

<!-- AVIS ET STATUT -->
<h2>6. Validation et Statut</h2>
<table>
    <tr><th>Champ</th><th>Valeur</th></tr>
    <tr><td class="label">Statut actuel</td><td>{{ $dossier->statusStage ?? '—' }}</td></tr>
    <tr><td class="label">Date validation</td><td>{{ $dossier->dateValidation ?? '—' }}</td></tr>
    <tr><td class="label">Date validation finale</td><td>{{ $dossier->dateValidationFinale ?? '—' }}</td></tr>
    <tr><td class="label">Avis encadrant</td><td>{{ $dossier->avisEncadrant ?? 'Non émis' }}</td></tr>
    @if($dossier->motifRejet)
    <tr><td class="label">Motif de rejet</td><td style="color:#721c24;">{{ $dossier->motifRejet }}</td></tr>
    @endif
</table>

<div class="footer">
    Document généré automatiquement par la plateforme ENCG Gestion Stages — Confidentiel
</div>

</body>
</html>
