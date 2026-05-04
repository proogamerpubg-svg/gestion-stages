import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import stageService from '../../services/stageService';
import { useAuth } from '../../context/AuthContext';

/**
 * EncadrantDashboard.js — Tableau de bord encadrant pédagogique.
 *
 * CORRECTIONS :
 *   1. Suppression alerte "demande en attente" → remplacée par système notifications
 *   2. Fix doublon "Pr. Pr." → nomComplet contient déjà le titre, on l'affiche directement
 *   3. Design filtres amélioré avec labels visibles
 */

const STATUTS_OPTIONS = [
  { value: '',                 label: 'Tous les statuts' },
  { value: 'declare',          label: 'Déclaré — Action requise' },
  { value: 'en_attente_admin', label: 'En attente admin' },
  { value: 'rejete',           label: 'Rejeté' },
  { value: 'en_cours',         label: 'En cours' },
  { value: 'journal_mi',       label: 'Journal mi-stage' },
  { value: 'journal_fin',      label: 'Journal fin de stage' },
  { value: 'cloture_deposee',  label: 'Clôture déposée' },
  { value: 'valide_encadrant', label: 'Validé par encadrant' },
  { value: 'cloture',          label: 'Clôturé' },
  { value: 'archive',          label: 'Archivé' },
];

const EncadrantDashboard = () => {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtres, setFiltres] = useState({ search: '', status: '', annee: '' });

  /**
   * CORRECTION #2 — Fix doublon "Pr. Pr. Mohammed Benali"
   * Le champ nomComplet contient déjà "Pr. Mohammed Benali"
   * → on l'affiche directement SANS ajouter "Pr." devant
   */
  const nomEncadrant = user?.profil?.nomComplet || user?.login || 'Encadrant';

  // Charger UNE SEULE FOIS au montage — filtrage côté frontend (instantané)
  const charger = useCallback(() => {
    setLoading(true);
    stageService.mesEtudiants()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const handleFiltreChange = (e) => {
    const { name, value } = e.target;
    setFiltres(f => ({ ...f, [name]: value }));
  };

  const reinitialiser = () => setFiltres({ search: '', status: '', annee: '' });

  // Tous les dossiers bruts (pour les KPIs)
  const tousLesDossiers = data?.etudiants || [];
  const encadrant       = data?.encadrant;

  // Années universitaires distinctes présentes en base (dynamique)
  const anneesDisponibles = [...new Set(
    tousLesDossiers
      .map(d => d.anneeUniversitaire)
      .filter(Boolean)
  )].sort();

  // Filtrage côté frontend — instantané sans appel API
  const dossiers = tousLesDossiers.filter(d => {
    const matchSearch = !filtres.search
      || d.etudiant?.nomComplet?.toLowerCase().includes(filtres.search.toLowerCase())
      || d.etudiant?.CNE?.toLowerCase().includes(filtres.search.toLowerCase());
    const matchStatus = !filtres.status || d.statusStage === filtres.status;
    const matchAnnee  = !filtres.annee  || d.anneeUniversitaire === filtres.annee;
    return matchSearch && matchStatus && matchAnnee;
  });

  // KPIs calculés sur TOUS les dossiers (pas filtrés)
  const nbDeclares = tousLesDossiers.filter(d => d.statusStage === 'declare').length;
  const nbJournaux = tousLesDossiers.filter(d => ['journal_mi', 'journal_fin'].includes(d.statusStage)).length;
  const nbClotures = tousLesDossiers.filter(d => d.statusStage === 'cloture_deposee').length;
  const nbEnCours  = tousLesDossiers.filter(d => d.statusStage === 'en_cours').length;

  return (
    <Layout title="Tableau de bord Encadrant">

      {/* ── Bannière de bienvenue ──
          CORRECTION #2 : afficher nomComplet directement (pas "Pr. {nomComplet}")
          car nomComplet contient déjà le titre "Pr." */}
      <div className="alert mb-4 d-flex align-items-center gap-3"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
        <i className="bi bi-person-badge fs-3" style={{ color: '#003366' }}></i>
        <div>
          <div style={{ fontWeight: 600, color: '#003366', fontSize: '1rem' }}>
            Bonjour, {nomEncadrant} !
          </div>
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            {data?.total ?? tousLesDossiers.length} étudiant{(data?.total ?? tousLesDossiers.length) > 1 ? 's' : ''} affecté{(data?.total ?? tousLesDossiers.length) > 1 ? 's' : ''}
          </div>
        </div>
        <div className="ms-auto">
          <Link to="/encadrant/profil" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-person me-1"></i>Mon profil
          </Link>
        </div>
      </div>

      {/*
        CORRECTION #1 : Suppression de l'alerte "demande en attente"
        Les notifications sont gérées via la cloche (page /notifications).
        On remplace par des KPI cards discrets et informatifs.
      */}

      {/* ── KPI Cards ── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card text-center h-100" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="card-body py-3">
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>
                {nbDeclares}
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-clock me-1"></i>En attente réponse
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center h-100" style={{ borderTop: '3px solid #3b82f6' }}>
            <div className="card-body py-3">
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3b82f6' }}>
                {nbEnCours}
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-play-circle me-1"></i>Stages en cours
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center h-100" style={{ borderTop: '3px solid #8b5cf6' }}>
            <div className="card-body py-3">
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8b5cf6' }}>
                {nbJournaux}
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-journal-text me-1"></i>Journaux à commenter
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center h-100" style={{ borderTop: '3px solid #10b981' }}>
            <div className="card-body py-3">
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
                {nbClotures}
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-award me-1"></i>Avis pédagogique requis
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* ── Liste étudiants avec filtres ──
          CORRECTION #3 : Design filtres amélioré avec labels visibles */}
      <div className="card">
        <div className="card-header-custom">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span>
              <i className="bi bi-people me-2"></i>
              Mes étudiants
              <span className="badge ms-2" style={{ background: '#003366', fontSize: '0.75rem' }}>
                {tousLesDossiers.length}
              </span>
            </span>
          </div>
        </div>

        {/* Zone de filtres avec labels */}
        <div className="px-3 py-3 border-bottom" style={{ background: '#f8fafc' }}>
          <div className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-search me-1"></i>RECHERCHE
              </label>
              <input
                type="text"
                name="search"
                className="form-control form-control-sm"
                placeholder="Nom de l'étudiant, CNE..."
                value={filtres.search}
                onChange={handleFiltreChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-funnel me-1"></i>FILTRER PAR STATUT
              </label>
              <select
                name="status"
                className="form-select form-select-sm"
                value={filtres.status}
                onChange={handleFiltreChange}
              >
                {STATUTS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-calendar3 me-1"></i>ANNÉE UNIV.
              </label>
              <select
                name="annee"
                className="form-select form-select-sm"
                value={filtres.annee}
                onChange={handleFiltreChange}
              >
                <option value="">Toutes</option>
                {anneesDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              {(filtres.search || filtres.status || filtres.annee) && (
                <button
                  className="btn btn-sm btn-outline-secondary w-100 mt-3"
                  onClick={reinitialiser}
                >
                  <i className="bi bi-x-circle me-1"></i>Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Indication de filtres actifs */}
          {(filtres.search || filtres.status) && (
            <div className="mt-2" style={{ fontSize: '0.78rem', color: '#0057a8' }}>
              <i className="bi bi-funnel-fill me-1"></i>
              Filtres actifs —
              {filtres.search && <span className="ms-1">Recherche : <strong>"{filtres.search}"</strong></span>}
              {filtres.status && <span className="ms-1">Statut : <strong>{STATUTS_OPTIONS.find(s => s.value === filtres.status)?.label}</strong></span>}
              <span className="ms-1 text-muted">({dossiers.length} résultat{dossiers.length > 1 ? 's' : ''} sur {tousLesDossiers.length})</span>
            </div>
          )}
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#003366' }} />
            </div>
          ) : dossiers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2" style={{ opacity: 0.3 }}></i>
              {filtres.search || filtres.status
                ? 'Aucun résultat pour ces critères.'
                : 'Aucun étudiant affecté pour le moment.'
              }
            </div>
          ) : (
            <table className="table table-encg table-hover mb-0">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>CNE</th>
                  <th>Stage / Organisme</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map(d => (
                  <tr key={d.idDossier}>
                    <td>
                      <div className="fw-500">{d.etudiant?.nomComplet}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {d.etudiant?.emailInstitutionnel}
                      </div>
                    </td>
                    <td>{d.etudiant?.CNE}</td>
                    <td>
                      {d.stage ? (
                        <>
                          <div style={{ fontSize: '0.85rem' }}>
                            {d.stage.sujetStage?.length > 40
                              ? d.stage.sujetStage.substring(0, 40) + '…'
                              : d.stage.sujetStage
                            }
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                            {d.stage.organisme?.raisonSociale}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.82rem' }}>Non déclaré</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={d.statusStage} />
                      {d.statusStage === 'declare' && (
                        <div className="text-warning mt-1" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-clock me-1"></i>Confirmer / Rejeter
                        </div>
                      )}
                      {['journal_mi', 'journal_fin'].includes(d.statusStage) && (
                        <div className="text-info mt-1" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-chat-quote me-1"></i>Commenter le journal
                        </div>
                      )}
                      {d.statusStage === 'cloture_deposee' && (
                        <div className="text-success mt-1" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-award me-1"></i>Avis pédagogique requis
                        </div>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/encadrant/dossier/${d.idDossier}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-eye me-1"></i>Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EncadrantDashboard;