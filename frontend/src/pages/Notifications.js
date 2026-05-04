import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import notificationService from '../services/notificationService';

/**
 * Notifications.js — Page dédiée aux notifications.
 *
 * CORRECTION BUG #3 :
 *   - Les messages ne s'affichent plus directement dans les dashboards
 *   - Page dédiée accessible via la cloche dans le Topbar
 *   - Design professionnel avec filtres (toutes / non lues)
 *   - Marquer comme lu (individuel + tout marquer)
 *   - Badge mis à jour dans le Topbar via polling
 */

const typeConfig = {
  validation:     { icon: 'bi-check-circle-fill', color: '#16a34a', bg: '#f0fdf4', label: 'Validation' },
  rejet:          { icon: 'bi-x-circle-fill',     color: '#dc2626', bg: '#fef2f2', label: 'Rejet'      },
  journal:        { icon: 'bi-journal-text',       color: '#7c3aed', bg: '#faf5ff', label: 'Journal'    },
  observation:    { icon: 'bi-chat-dots-fill',     color: '#0284c7', bg: '#f0f9ff', label: 'Commentaire'},
  cloture:        { icon: 'bi-mortarboard-fill',   color: '#d97706', bg: '#fffbeb', label: 'Clôture'    },
  nouveau_dossier:{ icon: 'bi-folder-plus',        color: '#003366', bg: '#eff6ff', label: 'Nouveau dossier'},
  avis_final:     { icon: 'bi-star-fill',          color: '#d97706', bg: '#fffbeb', label: 'Avis final' },
};

const getConfig = (type) => typeConfig[type] || {
  icon: 'bi-bell-fill', color: '#64748b', bg: '#f8fafc', label: 'Notification'
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now   = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 1)  return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH   < 24) return `Il y a ${diffH}h`;
  if (diffD   < 7)  return `Il y a ${diffD} jour${diffD > 1 ? 's' : ''}`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtre,   setFiltre]   = useState('toutes'); // 'toutes' | 'non_lues'
  const [marquant, setMarquant] = useState(null); // id en cours de traitement

  const charger = useCallback(async () => {
    try {
      const res = await notificationService.index();
      setNotifs(res.data.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const marquerLue = async (id) => {
    setMarquant(id);
    try {
      await notificationService.marquerLue(id);
      setNotifs(prev => prev.map(n => n.idNotification === id ? { ...n, lu: 1 } : n));
    } catch (_) {}
    finally { setMarquant(null); }
  };

  const marquerToutesLues = async () => {
    try {
      await notificationService.marquerToutesLues();
      setNotifs(prev => prev.map(n => ({ ...n, lu: 1 })));
    } catch (_) {}
  };

  const notifsFiltrees = filtre === 'non_lues'
    ? notifs.filter(n => !n.lu)
    : notifs;

  const nbNonLues = notifs.filter(n => !n.lu).length;

  return (
    <Layout title="Notifications">
      <div style={{ maxWidth: 720 }}>

        {/* ── En-tête ── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: '#003366' }}>
              <i className="bi bi-bell me-2"></i>Mes notifications
            </h5>
            {nbNonLues > 0 && (
              <small className="text-muted">
                {nbNonLues} notification{nbNonLues > 1 ? 's' : ''} non lue{nbNonLues > 1 ? 's' : ''}
              </small>
            )}
          </div>
          {nbNonLues > 0 && (
            <button className="btn btn-sm btn-outline-secondary" onClick={marquerToutesLues}>
              <i className="bi bi-check2-all me-1"></i>Tout marquer comme lu
            </button>
          )}
        </div>

        {/* ── Filtres ── */}
        <div className="d-flex gap-2 mb-4">
          <button
            className={`btn btn-sm ${filtre === 'toutes' ? 'btn-encg' : 'btn-outline-secondary'}`}
            onClick={() => setFiltre('toutes')}
          >
            Toutes ({notifs.length})
          </button>
          <button
            className={`btn btn-sm ${filtre === 'non_lues' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setFiltre('non_lues')}
          >
            Non lues ({nbNonLues})
          </button>
        </div>

        {/* ── Contenu ── */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#003366' }} />
          </div>
        ) : notifsFiltrees.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-5 text-muted">
              <i className="bi bi-bell-slash fs-1 d-block mb-3" style={{ opacity: 0.3 }}></i>
              {filtre === 'non_lues'
                ? 'Aucune notification non lue.'
                : 'Aucune notification pour le moment.'}
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {notifsFiltrees.map(n => {
              const cfg = getConfig(n.type);
              return (
                <div
                  key={n.idNotification}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${cfg.color}`,
                    background: n.lu ? '#fff' : cfg.bg,
                    transition: 'all 0.2s',
                  }}
                >
                  <div className="card-body py-3 px-3">
                    <div className="d-flex gap-3 align-items-start">

                      {/* Icône type */}
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: cfg.bg, border: `1px solid ${cfg.color}22`,
                        }}
                      >
                        <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: '1.1rem' }}></i>
                      </div>

                      {/* Contenu */}
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <span
                              className="badge mb-1"
                              style={{ background: cfg.color + '22', color: cfg.color, fontSize: '0.7rem' }}
                            >
                              {cfg.label}
                            </span>
                            {!n.lu && (
                              <span className="badge bg-danger ms-1 mb-1" style={{ fontSize: '0.65rem' }}>
                                Nouveau
                              </span>
                            )}
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {formatDate(n.createdAt)}
                          </span>
                        </div>
                        <p className="mb-0 mt-1" style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
                          {n.message}
                        </p>
                      </div>

                      {/* Bouton marquer lu */}
                      {!n.lu && (
                        <button
                          className="btn btn-sm btn-light flex-shrink-0"
                          title="Marquer comme lu"
                          onClick={() => marquerLue(n.idNotification)}
                          disabled={marquant === n.idNotification}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          {marquant === n.idNotification
                            ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                            : <i className="bi bi-check2"></i>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Retour ── */}
        <button className="btn btn-outline-secondary mt-4" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-2"></i>Retour
        </button>
      </div>
    </Layout>
  );
};

export default Notifications;