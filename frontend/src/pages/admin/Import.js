import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const AdminImport = () => {
  const navigate        = useNavigate();
  const { role }        = useAuth();
  const [fichier, setFichier]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [resultat, setResultat] = useState(null);
  const [dragging, setDragging] = useState(false);

  const importUrl = role === 'sys_admin' ? '/sysadmin/import-excel' : '/admin/import-excel';
  const retourUrl = role === 'sys_admin' ? '/sysadmin/import' : '/admin';

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Fichier Excel (.xlsx ou .xls) requis.');
      return;
    }
    setFichier(f);
    setResultat(null);
  };

  const handleSubmit = async () => {
    if (!fichier) return toast.warning('Sélectionnez un fichier Excel.');
    setLoading(true);
    const formData = new FormData();
    formData.append('fichier', fichier);
    try {
      const res = await api.post(importUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultat(res.data);
      if (res.data.crees > 0) {
        toast.success(`Import terminé : ${res.data.crees} dossier(s) créé(s).`);
      } else {
        toast.info('Import terminé. Aucun nouveau dossier créé (déjà existants).');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Import fichier Excel">
      <div style={{ maxWidth: 680 }}>

        {/* Message explicatif clair */}
        <div
          className="mb-4 p-4 rounded"
          style={{
            background: '#f0fdf4',
            border: '2px solid #86efac',
            borderLeft: '5px solid #16a34a',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-file-earmark-excel fs-4" style={{ color: '#16a34a' }}></i>
            <strong style={{ color: '#14532d', fontSize: '1rem' }}>
              Comment préparer votre fichier Excel ?
            </strong>
          </div>
          <p className="mb-2" style={{ fontSize: '0.88rem', color: '#166534' }}>
            Créez un fichier Excel <strong>(.xlsx ou .xls)</strong> avec exactement ces colonnes dans cet ordre :
          </p>
          <div
            className="p-3 rounded"
            style={{ background: '#fff', border: '1px solid #bbf7d0', fontSize: '0.82rem' }}
          >
            <div className="row g-2">
              {[
                { col: 'nomComplet', desc: 'Nom complet de l\'étudiant' },
                { col: 'emailEtudiant', desc: 'Email institutionnel de l\'étudiant' },
                { col: 'numApogee', desc: 'Numéro Apogée' },
                { col: 'CNE', desc: 'Code National de l\'Étudiant' },
                { col: 'telephone', desc: 'Téléphone de l\'étudiant' },
                { col: 'niveau', desc: 'Niveau (ex : 3A)' },
                { col: 'nomEncadrant', desc: 'Nom complet de l\'encadrant' },
                { col: 'emailEncadrant', desc: 'Email institutionnel de l\'encadrant' },
                { col: 'telEncadrant', desc: 'Téléphone de l\'encadrant' },
                { col: 'departement', desc: 'Département de l\'encadrant' },
                { col: 'filiere', desc: 'Filière' },
                { col: 'anneeUniversitaire', desc: 'Ex : 2025-2026' },
                { col: 'CIN', desc: 'Carte d\'identité nationale (optionnel)' },
              ].map(({ col, desc }) => (
                <div key={col} className="col-md-6 d-flex align-items-start gap-2">
                  <span
                    className="badge"
                    style={{ background: '#003366', color: '#fff', fontFamily: 'monospace', fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    {col}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.78rem' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mb-0 mt-2" style={{ fontSize: '0.8rem', color: '#166534' }}>
            <i className="bi bi-lightbulb me-1"></i>
            La <strong>première ligne</strong> doit contenir les noms des colonnes exactement comme indiqué.
          </p>
        </div>

        {/* Zone upload */}
        <div
          className={`upload-zone mb-4 ${dragging ? 'dragging' : ''} ${fichier ? 'success' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('excelInput').click()}
        >
          <input
            id="excelInput"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          {fichier ? (
            <>
              <i className="bi bi-file-earmark-excel fs-1 text-success d-block mb-2"></i>
              <div style={{ fontWeight: 600 }}>{fichier.name}</div>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                {(fichier.size / 1024).toFixed(1)} Ko — Cliquer pour changer
              </div>
            </>
          ) : (
            <>
              <i className="bi bi-cloud-upload fs-1 d-block mb-2" style={{ color: '#003366' }}></i>
              <div style={{ fontWeight: 600 }}>Glissez-déposez le fichier Excel ici</div>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                ou cliquez pour sélectionner (.xlsx, .xls)
              </div>
            </>
          )}
        </div>

        <div className="d-flex gap-3 mb-4">
          <button
            className="btn btn-encg px-4"
            onClick={handleSubmit}
            disabled={!fichier || loading}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Import en cours...</>
              : <><i className="bi bi-upload me-2"></i>Lancer l'import</>
            }
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate(retourUrl)}>
            Retour
          </button>
        </div>

        {/* Résultat */}
        {resultat && (
          <div className="card">
            <div className="card-header-custom">
              <i className="bi bi-clipboard-check"></i> Résultat de l'import
            </div>
            <div className="card-body" style={{ fontSize: '0.9rem' }}>
              <div className="row text-center mb-3">
                <div className="col-4">
                  <div className="text-success" style={{ fontSize: '2rem', fontWeight: 700 }}>
                    {resultat.crees}
                  </div>
                  <div className="text-muted">Créés</div>
                </div>
                <div className="col-4">
                  <div className="text-warning" style={{ fontSize: '2rem', fontWeight: 700 }}>
                    {resultat.ignores}
                  </div>
                  <div className="text-muted">Ignorés (existants)</div>
                </div>
                <div className="col-4">
                  <div className="text-danger" style={{ fontSize: '2rem', fontWeight: 700 }}>
                    {resultat.erreurs?.length || 0}
                  </div>
                  <div className="text-muted">Erreurs</div>
                </div>
              </div>
              {resultat.erreurs?.length > 0 && (
                <div>
                  <strong className="text-danger">Erreurs :</strong>
                  <ul className="mt-1">
                    {resultat.erreurs.map((e, i) => (
                      <li key={i} className="text-danger">{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminImport;