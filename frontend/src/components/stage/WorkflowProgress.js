import React from 'react';

/**
 * WorkflowProgress.js — Barre de progression du dossier de stage.
 *
 * CORRECTION : Valeurs de statut mises à jour selon Doc v3 Partie 6.
 *   Supprimé  : 'documents_deposes' (statut inexistant dans Doc v3)
 *   Corrigés  : en_attente_admin, journal_mi, journal_fin, cloture_deposee
 *   Ajouté    : valide_encadrant (étape 11 du workflow)
 */
const ETAPES = [
  { key: null,               label: 'Affectation' },
  { key: 'declare',          label: 'Déclaration' },
  { key: 'en_attente_admin', label: 'Documents' },   // CORRIGÉ : était en_attente_validation
  { key: 'en_cours',         label: 'En cours' },
  { key: 'journal_mi',       label: 'Journal 1' },   // CORRIGÉ : était journal_mi_stage
  { key: 'journal_fin',      label: 'Journal 2' },   // CORRIGÉ : était journal_fin_stage
  { key: 'cloture_deposee',  label: 'Clôture' },     // CORRIGÉ : était documents_cloture_deposes
  { key: 'valide_encadrant', label: 'Avis péda.' },  // AJOUTÉ  : manquait
  { key: 'cloture',          label: 'Validé' },
  { key: 'archive',          label: 'Archivé' },
];

const ORDER = ETAPES.map(e => e.key);

const WorkflowProgress = ({ status }) => {
  const currentIndex = ORDER.indexOf(status);

  return (
    <div className="workflow-steps">
      {ETAPES.map((etape, idx) => {
        const done    = currentIndex > idx;
        const current = currentIndex === idx;
        const cls     = done ? 'done' : current ? 'current' : '';

        return (
          <React.Fragment key={idx}>
            <div className="workflow-step">
              <div className={`step-circle ${cls}`}>
                {done
                  ? <i className="bi bi-check-lg" style={{ fontSize: '0.9rem' }} />
                  : idx + 1
                }
              </div>
              <div className={`step-label ${cls}`}>{etape.label}</div>
            </div>
            {idx < ETAPES.length - 1 && (
              <div className={`step-connector ${done ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WorkflowProgress;