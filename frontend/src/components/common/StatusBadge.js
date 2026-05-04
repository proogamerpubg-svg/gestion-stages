import React from 'react';

/**
 * StatusBadge.js — Badge visuel du statut d'un dossier de stage.
 *
 * CORRECTION : Valeurs et labels mis à jour selon Doc v3 Partie 6.
 *   Supprimé  : 'documents_deposes' (statut inexistant)
 *   Corrigés  : en_attente_admin, journal_mi, journal_fin, cloture_deposee
 *   Ajouté    : valide_encadrant
 */

// Labels affichés dans l'UI pour chaque statut (Doc v3 Partie 6 — Libellé UI)
const LABELS = {
  declare:          'Déclaré',
  en_attente_admin: 'En attente admin',    // CORRIGÉ : était 'en_attente_validation'
  rejete:           'Rejeté',
  en_cours:         'Stage en cours',
  journal_mi:       'Journal mi-stage',    // CORRIGÉ : était 'journal_mi_stage'
  journal_fin:      'Journal fin de stage',// CORRIGÉ : était 'journal_fin_stage'
  cloture_deposee:  'Clôture déposée',     // CORRIGÉ : était 'documents_cloture_deposes'
  valide_encadrant: 'Validé par encadrant',// AJOUTÉ  : manquait
  cloture:          'Clôturé',
  archive:          'Archivé',
};

const StatusBadge = ({ status }) => {
  if (!status) {
    return (
      <span className="badge-status" style={{ background: '#f1f5f9', color: '#64748b' }}>
        En attente de déclaration
      </span>
    );
  }

  return (
    <span className={`badge-status status-${status}`}>
      {LABELS[status] || status}
    </span>
  );
};

export default StatusBadge;