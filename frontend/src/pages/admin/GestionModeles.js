import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import api from '../../services/api';
import { toast } from 'react-toastify';

const TYPES_INFO = {
  convention:            { label: 'Convention de stage',       desc: 'À faire signer par l\'organisme d\'accueil et l\'ENCG.', icon: 'bi-file-earmark-text' },
  assurance:             { label: 'Attestation d\'assurance',  desc: 'Attestation d\'assurance responsabilité civile.',        icon: 'bi-shield-check' },
  lettre_recommandation: { label: 'Lettre de recommandation',  desc: 'Lettre de recommandation ENCG à présenter à l\'organisme.', icon: 'bi-envelope-paper' },
};

const GestionModeles = () => {
  const [modeles, setModeles]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState({});

  const charger = () => {
    setLoading(true);
    api.get('/admin/modeles-documents')
      .then(res => setModeles(res.data.modeles || []))
      .catch(() => toast.error('Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const handleUpload = async (type, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    setUploading(prev => ({ ...prev, [type]: true }));
    const formData = new FormData();
    formData.append('typeDocument', type);
    formData.append('fichier', file);
    try {
      await api.post('/admin/modeles-documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document mis à jour avec succès !');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'upload.');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <Layout title="Gestion des modèles de documents">
      <div style={{ maxWidth: 780 }}>

        <div className="info-box mb-4">
          <i className="bi bi-info-circle me-2"></i>
          Déposez ici les <strong>fichiers PDF officiels</strong> que les étudiants pourront télécharger
          depuis leur espace. Une fois déposé, le fichier est <strong>immédiatement disponible</strong>.
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#003366' }} />
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {modeles.map((m) => {
              const info      = TYPES_INFO[m.typeDocument] || {};
              const isLoading = uploading[m.typeDocument];

              return (
                <div className="card border-0 shadow-sm" key={m.typeDocument}>
                  <div className="card-body d-flex align-items-center gap-3 p-4">

                    {/* Icône */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                      background: '#EEF2FF', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`bi ${info.icon} fs-3`} style={{ color: '#003366' }}></i>
                    </div>

                    {/* Infos */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <strong style={{ fontSize: '0.95rem' }}>{info.label}</strong>
                        {/* Badge sans ✅ vert — juste texte simple */}
                        {m.disponible ? (
                          <span
                            className="badge"
                            style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.72rem' }}
                          >
                            Disponible
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem' }}
                          >
                            Non chargé
                          </span>
                        )}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.82rem' }}>{info.desc}</div>
                      {m.disponible && m.updatedAt && (
                        <small className="text-muted">
                          Dernière mise à jour : {new Date(m.updatedAt).toLocaleDateString('fr-FR')}
                        </small>
                      )}
                    </div>

                    {/* Bouton upload */}
                    <label
                      className="btn btn-outline-primary btn-sm mb-0"
                      style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {isLoading ? (
                        <><span className="spinner-border spinner-border-sm me-1" />Chargement...</>
                      ) : (
                        <><i className="bi bi-upload me-1"></i>{m.disponible ? 'Remplacer' : 'Déposer PDF'}</>
                      )}
                      <input
                        type="file"
                        accept=".pdf"
                        className="d-none"
                        disabled={isLoading}
                        onChange={e => handleUpload(m.typeDocument, e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message en rouge */}
        <div
          className="mt-4 p-3 rounded d-flex align-items-start gap-2"
          style={{
            background: '#fff1f2',
            border: '1px solid #fca5a5',
            borderLeft: '4px solid #dc2626',
            fontSize: '0.85rem',
          }}
        >
          <i className="bi bi-exclamation-circle-fill mt-1 flex-shrink-0" style={{ color: '#dc2626' }}></i>
          <div style={{ color: '#7f1d1d' }}>
            <strong>Format obligatoire :</strong> PDF uniquement — Taille maximum : 10 Mo par fichier.
            <br />
            <span style={{ fontSize: '0.8rem' }}>
              Tout nouveau fichier remplace automatiquement l'ancien. Cette action est irréversible.
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GestionModeles;