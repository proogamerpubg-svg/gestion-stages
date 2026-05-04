import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import stageService from '../../services/stageService';

const AdminArchives = () => {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filtreAnnee, setFiltreAnnee] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');

  useEffect(() => {
    stageService.dossierArchives()
      .then(res => setDossiers(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  // Années universitaires distinctes extraites des dossiers réels
  const anneesDisponibles = [...new Set(
    dossiers.map(d => d.anneeUniversitaire).filter(Boolean)
  )].sort();

  // Niveaux distincts extraits des dossiers réels
  const niveauxDisponibles = [...new Set(
    dossiers.map(d => d.etudiant?.niveau).filter(Boolean)
  )].sort();

  const filtres = dossiers.filter(d => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      d.etudiant?.nomComplet?.toLowerCase().includes(s) ||
      d.etudiant?.CNE?.toLowerCase().includes(s) ||
      d.anneeUniversitaire?.includes(s);
    const matchAnnee  = !filtreAnnee  || d.anneeUniversitaire === filtreAnnee;
    const matchNiveau = !filtreNiveau || d.etudiant?.niveau === filtreNiveau;
    return matchSearch && matchAnnee && matchNiveau;
  });

  const reinitialiser = () => {
    setSearch('');
    setFiltreAnnee('');
    setFiltreNiveau('');
  };

  return (
    <Layout title="Archives des dossiers">
      <div className="card">
        <div className="card-header-custom">
          <i className="bi bi-archive"></i> Dossiers archivés ({filtres.length})
        </div>

        {/* Filtres */}
        <div className="card-body border-bottom">
          <div className="row g-2 align-items-end">
            {/* Recherche texte */}
            <div className="col-md-4">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-search me-1"></i>RECHERCHE
              </label>
              <input
                className="form-control form-control-sm"
                placeholder="Nom, CNE..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Filtre année universitaire */}
            <div className="col-md-3">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                <i className="bi bi-calendar3 me-1"></i>ANNÉE UNIV.
              </label>
              <select
                className="form-select form-select-sm"
                value={filtreAnnee}
                onChange={e => setFiltreAnnee(e.target.value)}
              >
                <option value="">Toutes les années</option>
                {anneesDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Filtre niveau */}
            <div className="col-md-2">
              <label className="form-label mb-1 text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                NIVEAU
              </label>
              <select
                className="form-select form-select-sm"
                value={filtreNiveau}
                onChange={e => setFiltreNiveau(e.target.value)}
              >
                <option value="">Tous</option>
                {niveauxDisponibles.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <div className="col-md-1">
              {(search || filtreAnnee || filtreNiveau) && (
                <button
                  className="btn btn-outline-secondary btn-sm w-100"
                  onClick={reinitialiser}
                  title="Réinitialiser les filtres"
                >
                  <i className="bi bi-x-circle"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#003366' }} />
            </div>
          ) : filtres.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-archive fs-1 d-block mb-2"></i>
              {dossiers.length === 0
                ? 'Aucun dossier archivé.'
                : 'Aucun résultat pour ces filtres.'
              }
            </div>
          ) : (
            <table className="table table-encg table-hover mb-0">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Niveau</th>
                  <th>Encadrant</th>
                  <th>Organisme</th>
                  <th>Année univ.</th>
                  <th>Date archivage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtres.map(d => (
                  <tr key={d.idDossier}>
                    <td>
                      <div className="fw-500">{d.etudiant?.nomComplet}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{d.etudiant?.CNE}</div>
                    </td>
                    <td>
                      <span className="badge bg-primary" style={{ fontSize: '0.72rem' }}>
                        {d.etudiant?.niveau || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{d.encadrant?.nomComplet}</td>
                    <td style={{ fontSize: '0.82rem' }}>{d.stage?.organisme?.raisonSociale || '—'}</td>
                    <td>{d.anneeUniversitaire}</td>
                    <td style={{ fontSize: '0.82rem' }}>{d.dateArchivage}</td>
                    <td>
                      <Link to={`/admin/dossier/${d.idDossier}`} className="btn btn-sm btn-outline-secondary">
                        <i className="bi bi-eye me-1"></i>Consulter
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

export default AdminArchives;