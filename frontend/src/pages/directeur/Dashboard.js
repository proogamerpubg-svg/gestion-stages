import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import stageService from '../../services/stageService';
import { useAuth } from '../../context/AuthContext';

const STATUTS = [
  { value: '',                 label: 'Tous les statuts' },
  { value: 'declare',          label: 'Déclaré' },
  { value: 'en_attente_admin', label: 'En attente admin' },
  { value: 'rejete',           label: 'Rejeté' },
  { value: 'en_cours',         label: 'En cours' },
  { value: 'journal_mi',       label: 'Journal mi-stage' },
  { value: 'journal_fin',      label: 'Journal fin de stage' },
  { value: 'cloture_deposee',  label: 'Clôture déposée' },
  { value: 'valide_encadrant', label: 'Validé encadrant' },
  { value: 'cloture',          label: 'Clôturé' },
  { value: 'archive',          label: 'Archivé' },
];

const DirecteurDashboard = () => {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtres, setFiltres]   = useState({ annee: '', niveau: '', status: '', search: '' });

  const charger = (params = {}) => {
    setLoading(true);
    stageService.listeDossiersDir(params)
      .then(res => setDossiers(res.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const handleFiltreChange = (e) => {
    const { name, value } = e.target;
    const nouveauxFiltres = { ...filtres, [name]: value };
    setFiltres(nouveauxFiltres);
    const params = Object.fromEntries(
      Object.entries(nouveauxFiltres).filter(([, v]) => v !== '')
    );
    charger(params);
  };

  const reinitialiserFiltres = () => {
    setFiltres({ annee: '', niveau: '', status: '', search: '' });
    charger();
  };

  const total     = dossiers.length;
  const enCours   = dossiers.filter(d => d.statusStage === 'en_cours').length;
  const enAttente = dossiers.filter(d => d.statusStage === 'en_attente_admin').length;
  const clotures  = dossiers.filter(d => ['cloture', 'archive'].includes(d.statusStage)).length;

  // Années universitaires distinctes présentes en base (dynamique)
  const anneesDisponibles = [...new Set(
    dossiers.map(d => d.anneeUniversitaire).filter(Boolean)
  )].sort();

  const nomDirecteur = user?.profil?.nomComplet || user?.login || 'Directeur';

  return (
    <Layout title="Tableau de bord — Direction">

      {/* Bannière de bienvenue — sans message "lecture seule" */}
      <div
        className="alert mb-4 d-flex align-items-center gap-3"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}
      >
        <i className="bi bi-person-circle fs-3" style={{ color: '#003366' }}></i>
        <div>
          <div style={{ fontWeight: 600, color: '#003366', fontSize: '1rem' }}>
            Bonjour, {nomDirecteur} !
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total dossiers',    value: total,     icon: 'bi-folder2-open', color: '#003366' },
          { label: 'En cours',          value: enCours,   icon: 'bi-play-circle',  color: '#10b981' },
          { label: 'En attente',        value: enAttente, icon: 'bi-hourglass',    color: '#f59e0b' },
          { label: 'Clôturés/Archivés', value: clotures,  icon: 'bi-check-circle', color: '#6366f1' },
        ].map((s, i) => (
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
        <div className="card-header-custom">
          <i className="bi bi-funnel"></i> Filtres de consultation
        </div>
        <div className="card-body px-3 py-3" style={{ background: '#f8fafc' }}>
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
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
            <div className="col-md-3">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-funnel me-1"></i>FILTRER PAR STATUT
              </label>
              <select name="status" className="form-select form-select-sm" value={filtres.status} onChange={handleFiltreChange}>
                {STATUTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-calendar3 me-1"></i>ANNÉE UNIV.
              </label>
              <select name="annee" className="form-select form-select-sm" value={filtres.annee} onChange={handleFiltreChange}>
                <option value="">Toutes les années</option>
                {anneesDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                NIVEAU
              </label>
              <select name="niveau" className="form-select form-select-sm" value={filtres.niveau} onChange={handleFiltreChange}>
                <option value="">Tous</option>
                <option value="3A">3ème Année</option>
              </select>
            </div>
            <div className="col-md-1">
              {(filtres.search || filtres.status || filtres.annee || filtres.niveau) && (
                <button className="btn btn-outline-secondary btn-sm w-100 mt-3" onClick={reinitialiserFiltres}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau dossiers */}
      <div className="card">
        <div className="card-header-custom">
          <i className="bi bi-table"></i> Dossiers de stage
          <span
            className="ms-2 badge"
            style={{ background: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}
          >
            {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#003366' }} />
            </div>
          ) : dossiers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Aucun dossier trouvé pour ces critères.
            </div>
          ) : (
            <table className="table table-encg table-hover mb-0">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Encadrant</th>
                  <th>Organisme</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map(d => (
                  <tr key={d.idDossier}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{d.etudiant?.nomComplet}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{d.etudiant?.CNE}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{d.encadrant?.nomComplet}</td>
                    <td style={{ fontSize: '0.82rem' }}>{d.stage?.organisme?.raisonSociale || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{d.stage?.periode || '—'}</td>
                    <td><StatusBadge status={d.statusStage} /></td>
                    <td>
                      <Link
                        to={`/directeur/dossier/${d.idDossier}`}
                        className="btn btn-sm btn-outline-secondary"
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

export default DirecteurDashboard;