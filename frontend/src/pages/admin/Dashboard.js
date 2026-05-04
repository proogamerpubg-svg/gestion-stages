import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import stageService from '../../services/stageService';

/**
 * AdminDashboard.js — Tableau de bord administration.
 *
 * CORRECTION BUG #1 : STATUTS array corrigé (Doc v3 Partie 6).
 * CORRECTION BUG #2 : STATUT_LABELS corrigé + valide_encadrant ajouté.
 * CORRECTION BUG #3 : Stats rapides — statut 'en_attente_admin' corrigé.
 * CORRECTION BUG #4 : Filtres annee + niveau ajoutés (Doc v3 Partie 3, point 13).
 */

// CORRECTION BUG #1+2 : Valeurs et labels officiels (Doc v3 Partie 6)
const STATUTS_OPTIONS = [
  { value: '',                 label: 'Tous les statuts' },
  { value: 'declare',          label: 'Déclaré' },
  { value: 'en_attente_admin', label: 'En attente admin' },   // CORRIGÉ
  { value: 'rejete',           label: 'Rejeté' },
  { value: 'en_cours',         label: 'En cours' },
  { value: 'journal_mi',       label: 'Journal mi-stage' },   // CORRIGÉ
  { value: 'journal_fin',      label: 'Journal fin de stage' },// CORRIGÉ
  { value: 'cloture_deposee',  label: 'Clôture déposée' },    // CORRIGÉ
  { value: 'valide_encadrant', label: 'Validé par encadrant' },// AJOUTÉ
  { value: 'cloture',          label: 'Clôturé' },
  { value: 'archive',          label: 'Archivé' },
];

const AdminDashboard = () => {
  const [dossiers, setDossiers] = useState([]);
  const [meta, setMeta]         = useState({});
  const [loading, setLoading]   = useState(true);

  // CORRECTION BUG #4 : Ajout des filtres annee et niveau
  const [filtres, setFiltres] = useState({
    status: '',
    search: '',
    annee:  '',
    niveau: '',
    page:   1,
  });

  const charger = useCallback(() => {
    setLoading(true);
    // Envoyer uniquement les filtres non vides
    const params = Object.fromEntries(
      Object.entries(filtres).filter(([, v]) => v !== '')
    );
    stageService.listeDossiers(params)
      .then(res => {
        setDossiers(res.data.data || []);
        setMeta({ total: res.data.total, lastPage: res.data.last_page });
      })
      .finally(() => setLoading(false));
  }, [filtres]);

  useEffect(() => { charger(); }, [charger]);

  const handleFiltreChange = (e) => {
    const { name, value } = e.target;
    setFiltres(f => ({ ...f, [name]: value, page: 1 }));
  };

  const reinitialiser = () => {
    setFiltres({ status: '', search: '', annee: '', niveau: '', page: 1 });
  };

  // Années universitaires distinctes présentes en base (dynamique)
  const anneesDisponibles = [...new Set(
    dossiers.map(d => d.anneeUniversitaire).filter(Boolean)
  )].sort();

  // CORRECTION BUG #3 : Statut correct 'en_attente_admin'
  const stats = [
    {
      label: 'En attente validation',
      value: dossiers.filter(d => d.statusStage === 'en_attente_admin').length, // CORRIGÉ
      color: '#f59e0b',
      icon:  'bi-hourglass',
    },
    {
      label: 'En cours',
      value: dossiers.filter(d => d.statusStage === 'en_cours').length,
      color: '#10b981',
      icon:  'bi-play-circle',
    },
    {
      label: 'Rejetés',
      value: dossiers.filter(d => d.statusStage === 'rejete').length,
      color: '#ef4444',
      icon:  'bi-x-circle',
    },
    {
      label: 'Clôturés',
      value: dossiers.filter(d => d.statusStage === 'cloture').length,
      color: '#003366',
      icon:  'bi-check-circle',
    },
  ];

  return (
    <Layout title="Tableau de bord Administration">

      {/* Stats rapides */}
      <div className="row g-3 mb-4">
        {stats.map((s, i) => (
          <div key={i} className="col-md-3">
            <div className="card text-center p-3">
              <i className={`bi ${s.icon} fs-2 mb-1`} style={{ color: s.color }}></i>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres — style identique à Encadrant + années dynamiques */}
      <div className="card mb-4">
        <div className="card-body px-3 py-3" style={{ background: '#f8fafc' }}>
          <div className="row g-2 align-items-end">

            {/* Recherche */}
            <div className="col-md-3">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-search me-1"></i>RECHERCHE
              </label>
              <input
                name="search"
                className="form-control form-control-sm"
                placeholder="Nom étudiant ou CNE..."
                value={filtres.search}
                onChange={handleFiltreChange}
              />
            </div>

            {/* Statut */}
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

            {/* Année universitaire — dynamique depuis la base */}
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
                <option value="">Toutes les années</option>
                {anneesDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Niveau */}
            <div className="col-md-1">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                NIVEAU
              </label>
              <select
                name="niveau"
                className="form-select form-select-sm"
                value={filtres.niveau}
                onChange={handleFiltreChange}
              >
                <option value="">Niveau</option>
                <option value="3A">3ème Année</option>
              </select>
            </div>

            {/* Réinitialiser */}
            <div className="col-md-1">
              {(filtres.search || filtres.status || filtres.annee || filtres.niveau) && (
                <button
                  className="btn btn-sm btn-outline-secondary w-100 mt-3"
                  onClick={reinitialiser}
                  title="Réinitialiser"
                >
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="col-md-2 text-end">
              <Link to="/admin/import" className="btn btn-encg btn-sm me-2">
                <i className="bi bi-file-excel me-1"></i>Import Excel
              </Link>
              <Link to="/admin/archives" className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-archive me-1"></i>Archives
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des dossiers */}
      <div className="card">
        <div className="card-header-custom">
          <i className="bi bi-folder2-open"></i> Dossiers de stage
          <span className="ms-2 badge bg-secondary">{meta.total || 0}</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#003366' }} />
            </div>
          ) : dossiers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>Aucun dossier trouvé.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-encg table-hover mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Étudiant</th>
                    <th>Encadrant</th>
                    <th>Organisme</th>
                    <th>Période</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map(d => (
                    <tr key={d.idDossier}>
                      <td className="text-muted">{d.idDossier}</td>
                      <td>
                        <div className="fw-500" style={{ fontWeight: 500 }}>{d.etudiant?.nomComplet}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{d.etudiant?.CNE}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{d.encadrant?.nomComplet}</td>
                      <td style={{ fontSize: '0.82rem' }}>{d.stage?.organisme?.raisonSociale || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{d.stage?.periode || '—'}</td>
                      <td><StatusBadge status={d.statusStage} /></td>
                      <td>
                        <Link to={`/admin/dossier/${d.idDossier}`} className="btn btn-sm btn-outline-primary">
                          <i className="bi bi-eye me-1"></i>Gérer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.lastPage > 1 && (
          <div className="card-footer d-flex justify-content-between align-items-center py-2">
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>
              Page {filtres.page} / {meta.lastPage}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={filtres.page <= 1}
                onClick={() => setFiltres(f => ({ ...f, page: f.page - 1 }))}
              >
                Précédent
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={filtres.page >= meta.lastPage}
                onClick={() => setFiltres(f => ({ ...f, page: f.page + 1 }))}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;