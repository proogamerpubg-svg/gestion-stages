import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import WorkflowProgress from '../../components/stage/WorkflowProgress';
import stageService from '../../services/stageService';
import { toast } from 'react-toastify';

const DOCS_ENCADRANT = [
  {
    key:    'attestation',
    label:  'Attestation de fin de stage',
    icon:   'bi-file-earmark-check',
    color:  '#10b981',
    bg:     '#f0fdf4',
    border: '#6ee7b7',
  },
  {
    key:    'rapport',
    label:  'Rapport de stage',
    icon:   'bi-file-earmark-text',
    color:  '#3b82f6',
    bg:     '#eff6ff',
    border: '#93c5fd',
  },
];

const EncadrantDossierPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [dossier, setDossier]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [motifRejet, setMotifRejet]     = useState('');
  const [showRejet, setShowRejet]       = useState(false);
  const [commentaire1, setCommentaire1] = useState('');
  const [commentaire2, setCommentaire2] = useState('');
  const [avis, setAvis]                 = useState('');

  const charger = () => {
    stageService.voirDossierEnc(id)
      .then(res => {
        const d = res.data.dossier;
        setDossier(d);
        setCommentaire1(d?.reponseMission1 || '');
        setCommentaire2(d?.reponseMission2 || '');
        setAvis(d?.avisEncadrant || '');
      })
      .catch(() => toast.error('Dossier introuvable ou accès refusé.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, [id]);

  const action = async (fn, msg) => {
    setSubmitting(true);
    try {
      await fn();
      toast.success(msg);
      charger();
      setShowRejet(false);
      setMotifRejet('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  };

  const telecharger = (cheminFichier, nomDoc) => {
    const url = `http://localhost:8000/storage/${cheminFichier}`;
    const a   = document.createElement('a');
    a.href    = url;
    a.target  = '_blank';
    a.rel     = 'noopener noreferrer';
    a.download = nomDoc;
    a.click();
  };

  if (loading) return (
    <Layout title="Dossier étudiant">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  if (!dossier) return (
    <Layout title="Dossier étudiant">
      <div className="alert alert-danger">Dossier introuvable.</div>
    </Layout>
  );

  const { etudiant, stage } = dossier;
  const status = dossier.statusStage;

  const docsClotureVisibles = [
    'cloture_deposee', 'valide_encadrant', 'cloture', 'archive'
  ].includes(status);

  return (
    <Layout title={`Dossier — ${etudiant?.nomComplet}`}>
      <div style={{ maxWidth: 900 }}>

        <div className="d-flex gap-2 mb-4">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/encadrant')}>
            <i className="bi bi-arrow-left me-1"></i>Retour
          </button>
        </div>

        {/* ── Action : Confirmer / Rejeter ── */}
        {status === 'declare' && (
          <div
            className="mb-4 rounded overflow-hidden"
            style={{ border: '2px solid #f59e0b', boxShadow: '0 4px 12px rgba(245,158,11,0.15)' }}
          >
            <div
              className="d-flex align-items-center gap-2 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}
            >
              <i className="bi bi-bell-fill fs-5"></i>
              <div>
                <strong style={{ fontSize: '1rem' }}>Action requise — Demande d'encadrement</strong>
                <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                  Vérifiez les informations ci-dessous avant de répondre. Passé 24h sans réponse, l'encadrement sera automatiquement confirmé.
                </div>
              </div>
            </div>
            <div className="px-4 py-4" style={{ background: '#fffbeb' }}>
              <p className="mb-4" style={{ fontSize: '0.95rem' }}>
                <strong style={{ color: '#003366' }}>{etudiant?.nomComplet}</strong> a soumis une demande d'encadrement.
                Consultez les informations ci-dessous avant de répondre.
              </p>
              {!showRejet && (
                <div className="d-flex gap-3 flex-wrap">
                  <button
                    className="btn px-4 py-2 d-flex align-items-center gap-2"
                    style={{
                      background: '#16a34a', color: '#fff', border: 'none',
                      borderRadius: 10, fontWeight: 600, fontSize: '0.92rem',
                      boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                    }}
                    disabled={submitting}
                    onClick={() => action(
                      () => stageService.confirmerEncadrement(id),
                      "Encadrement confirmé. L'étudiant peut déposer ses documents."
                    )}
                  >
                    {submitting
                      ? <span className="spinner-border spinner-border-sm" />
                      : <i className="bi bi-check-lg me-1"></i>
                    }
                    Confirmer l'encadrement
                  </button>
                  <button
                    className="btn px-4 py-2 d-flex align-items-center gap-2"
                    style={{
                      background: '#fff', color: '#dc2626',
                      border: '2px solid #dc2626', borderRadius: 10,
                      fontWeight: 600, fontSize: '0.92rem',
                    }}
                    onClick={() => setShowRejet(true)}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Rejeter la demande
                  </button>
                </div>
              )}
              {showRejet && (
                <div className="p-3 rounded" style={{ background: '#fff1f2', border: '1px solid #fca5a5' }}>
                  <label className="form-label fw-600 text-danger">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Motif du rejet <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control mb-3" rows={3}
                    value={motifRejet} onChange={e => setMotifRejet(e.target.value)}
                    placeholder="Écrivez ici le motif de votre refus (ex: L'étudiant doit choisir un organisme différent)..."
                    style={{ borderColor: '#fca5a5' }}
                  />
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-danger btn-sm px-3"
                      disabled={motifRejet.length < 10 || submitting}
                      onClick={() => action(
                        () => stageService.rejeterEncadrement(id, motifRejet),
                        "Demande rejetée. L'étudiant a été notifié."
                      )}
                    >
                      <i className="bi bi-send me-1"></i>Confirmer le rejet
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setShowRejet(false); setMotifRejet(''); }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Action : Commenter journal mi-stage ── */}
        {status === 'journal_mi' && dossier.mission1 && !dossier.reponseMission1 && (
          <div className="card mb-4" style={{ border: '1px solid #93c5fd' }}>
            <div className="card-header-custom" style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
              <i className="bi bi-journal me-2"></i>Action requise — Commenter le journal de mi-stage
            </div>
            <div className="card-body">
              <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong>Journal mi-stage (étudiant) :</strong>
                <p className="mt-2 mb-0" style={{ fontSize: '0.9rem' }}>{dossier.mission1}</p>
              </div>
              <label className="form-label fw-600">Votre commentaire <span className="text-danger">*</span></label>
              <textarea
                className="form-control mb-2" rows={4}
                value={commentaire1} onChange={e => setCommentaire1(e.target.value)}
                placeholder="Min. 20 caractères..."
              />
              <button
                className="btn btn-primary btn-sm"
                disabled={commentaire1.length < 20 || submitting}
                onClick={() => action(
                  () => stageService.commenterMiStage(id, commentaire1),
                  'Commentaire enregistré.'
                )}
              >
                <i className="bi bi-send me-1"></i>Envoyer
              </button>
            </div>
          </div>
        )}

        {/* ── Action : Commenter journal fin de stage ── */}
        {status === 'journal_fin' && dossier.mission2 && !dossier.reponseMission2 && (
          <div className="card mb-4" style={{ border: '1px solid #93c5fd' }}>
            <div className="card-header-custom" style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
              <i className="bi bi-journal-check me-2"></i>Action requise — Commenter le journal de fin de stage
            </div>
            <div className="card-body">
              <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong>Journal fin de stage (étudiant) :</strong>
                <p className="mt-2 mb-0" style={{ fontSize: '0.9rem' }}>{dossier.mission2}</p>
              </div>
              <label className="form-label fw-600">Votre commentaire <span className="text-danger">*</span></label>
              <textarea
                className="form-control mb-2" rows={4}
                value={commentaire2} onChange={e => setCommentaire2(e.target.value)}
                placeholder="Min. 20 caractères..."
              />
              <button
                className="btn btn-primary btn-sm"
                disabled={commentaire2.length < 20 || submitting}
                onClick={() => action(
                  () => stageService.commenterFinStage(id, commentaire2),
                  'Commentaire enregistré.'
                )}
              >
                <i className="bi bi-send me-1"></i>Envoyer
              </button>
            </div>
          </div>
        )}

        {/* ── Action : Avis pédagogique final ── */}
        {status === 'cloture_deposee' && !dossier.avisEncadrant && (
          <div className="card mb-4" style={{ border: '1px solid #6ee7b7' }}>
            <div className="card-header-custom" style={{ background: '#dcfce7', color: '#14532d' }}>
              <i className="bi bi-award me-2"></i>Action requise — Avis pédagogique final
            </div>
            <div className="card-body">
              <p className="mb-3">L'étudiant a déposé son attestation et son rapport. Veuillez émettre votre avis.</p>
              <label className="form-label fw-600">Votre avis final <span className="text-danger">*</span></label>
              <textarea
                className="form-control mb-2" rows={4}
                value={avis} onChange={e => setAvis(e.target.value)}
                placeholder="Min. 30 caractères..."
              />
              <button
                className="btn btn-success btn-sm"
                disabled={avis.length < 30 || submitting}
                onClick={() => action(
                  () => stageService.avisFinalEncadrant(id, avis),
                  "Avis pédagogique soumis. L'administration peut valider officiellement."
                )}
              >
                <i className="bi bi-award me-1"></i>Soumettre l'avis final
              </button>
            </div>
          </div>
        )}

        {/* ── Workflow ── */}
        <div className="card mb-4">
          <div className="card-header-custom">
            <i className="bi bi-diagram-3"></i> Statut du dossier
          </div>
          <div className="card-body">
            <WorkflowProgress status={status} />
            <div className="d-flex justify-content-center gap-3 mt-2 align-items-center">
              <StatusBadge status={status} />
              {dossier.motifRejet && (
                <span className="text-danger" style={{ fontSize: '0.82rem' }}>
                  Motif : {dossier.motifRejet}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="row g-4">

          {/* ── Étudiant — enrichi ── */}
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header-custom">
                <i className="bi bi-person"></i> Étudiant
              </div>
              <div className="card-body" style={{ fontSize: '0.85rem' }}>
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '45%' }}>Nom complet</td>
                      <td><strong>{etudiant?.nomComplet}</strong></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Email institutionnel</td>
                      <td>{etudiant?.emailInstitutionnel}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">N° Apogée</td>
                      <td>{etudiant?.numApogee}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Téléphone</td>
                      <td>{etudiant?.telephone}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">CNE</td>
                      <td>{etudiant?.CNE}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">CIN</td>
                      <td>{etudiant?.CIN || <span className="text-muted fst-italic">—</span>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Niveau</td>
                      <td><span className="badge bg-primary" style={{ fontSize: '0.72rem' }}>3ème Année</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Stage — enrichi ── */}
          {stage && (
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header-custom">
                  <i className="bi bi-building"></i> Stage
                </div>
                <div className="card-body" style={{ fontSize: '0.85rem' }}>
                  <table className="table table-sm table-borderless mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: '45%' }}>Sujet</td>
                        <td><strong>{stage.sujetStage}</strong></td>
                      </tr>
                      <tr>
                        <td className="text-muted">Période</td>
                        <td>{stage.periode}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Année univ.</td>
                        <td>{dossier.anneeUniversitaire || '—'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Organisme</td>
                        <td><strong>{stage.organisme?.raisonSociale}</strong></td>
                      </tr>
                      <tr>
                        <td className="text-muted">Type</td>
                        <td>
                          {stage.organisme?.type === 'public'
                            ? <span className="badge" style={{background:'#dbeafe',color:'#1d4ed8',fontSize:'0.72rem'}}>Public</span>
                            : <span className="badge" style={{background:'#fef3c7',color:'#92400e',fontSize:'0.72rem'}}>Privé</span>
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Responsable</td>
                        <td>{stage.organisme?.nomCompletResponsable}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Tél. responsable</td>
                        <td>{stage.organisme?.telephoneResponsable}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Email responsable</td>
                        <td>{stage.organisme?.emailResponsable}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Documents de clôture ── */}
          {stage && (
            <div className="col-12">
              <div className="card">
                <div className="card-header-custom d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-file-earmark-check me-2"></i>
                    Documents de clôture
                  </span>
                  {!docsClotureVisibles && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 400, opacity: 0.85 }}>
                      En attente de dépôt par l'étudiant
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {!docsClotureVisibles ? (
                    <div className="text-center py-3 text-muted" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-hourglass-split me-2"></i>
                      L'étudiant n'a pas encore déposé les documents de clôture.
                      Ces documents (attestation de fin de stage + rapport) seront déposés par l'étudiant
                      à la fin de son stage.
                    </div>
                  ) : (
                    <div className="row g-3">
                      {DOCS_ENCADRANT.map(doc => {
                        const fichier = stage[doc.key];
                        const depose  = !!fichier;
                        return (
                          <div key={doc.key} className="col-md-6">
                            <div
                              className="d-flex align-items-center gap-3 p-3 rounded"
                              style={{
                                border: `1px solid ${depose ? doc.border : '#e2e8f0'}`,
                                background: depose ? doc.bg : '#f8fafc',
                              }}
                            >
                              <div
                                className="d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: 48, height: 48, borderRadius: 10,
                                  background: depose ? doc.color + '18' : '#e2e8f0',
                                }}
                              >
                                <i
                                  className={`bi ${doc.icon}`}
                                  style={{ fontSize: '1.4rem', color: depose ? doc.color : '#94a3b8' }}
                                ></i>
                              </div>
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{doc.label}</div>
                                <div className="mt-1">
                                  {depose ? (
                                    <span style={{
                                      background: doc.color + '18', color: doc.color,
                                      fontSize: '0.72rem', fontWeight: 600,
                                      padding: '3px 8px', borderRadius: 20,
                                    }}>
                                      <i className="bi bi-check-circle-fill me-1"></i>Déposé
                                    </span>
                                  ) : (
                                    <span style={{
                                      background: '#f1f5f9', color: '#94a3b8',
                                      fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20,
                                    }}>
                                      <i className="bi bi-dash-circle me-1"></i>Non déposé
                                    </span>
                                  )}
                                </div>
                              </div>
                              {depose && (
                                <button
                                  className="btn btn-sm flex-shrink-0"
                                  style={{
                                    background: doc.color, color: '#fff', border: 'none',
                                    borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem',
                                  }}
                                  onClick={() => telecharger(fichier, `${doc.label}.pdf`)}
                                >
                                  <i className="bi bi-download me-1"></i>Voir
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Journal de bord ── */}
          {(dossier.mission1 || dossier.mission2 || dossier.reponseMission1 || dossier.reponseMission2 || dossier.avisEncadrant) && (
            <div className="col-12">
              <div className="card">
                <div className="card-header-custom">
                  <i className="bi bi-journal-text"></i> Journal de bord
                </div>
                <div className="card-body" style={{ fontSize: '0.85rem' }}>
                  {dossier.mission1 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#fafafa', border: '1px solid #e2e8f0' }}>
                      <strong className="text-primary">
                        <i className="bi bi-person me-1"></i>Journal mi-stage (étudiant) :
                      </strong>
                      <p className="mt-2 mb-0">{dossier.mission1}</p>
                    </div>
                  )}
                  {dossier.reponseMission1 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <strong>
                        <i className="bi bi-chat-quote me-1"></i>Votre commentaire mi-stage :
                      </strong>
                      <p className="mt-2 mb-0">{dossier.reponseMission1}</p>
                    </div>
                  )}
                  {dossier.mission2 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#fafafa', border: '1px solid #e2e8f0' }}>
                      <strong className="text-primary">
                        <i className="bi bi-person me-1"></i>Journal fin de stage (étudiant) :
                      </strong>
                      <p className="mt-2 mb-0">{dossier.mission2}</p>
                    </div>
                  )}
                  {dossier.reponseMission2 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <strong>
                        <i className="bi bi-chat-quote me-1"></i>Votre commentaire fin de stage :
                      </strong>
                      <p className="mt-2 mb-0">{dossier.reponseMission2}</p>
                    </div>
                  )}
                  {dossier.avisEncadrant && (
                    <div className="p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <strong>
                        <i className="bi bi-award me-1"></i>Votre avis pédagogique final :
                      </strong>
                      <p className="mt-2 mb-0">{dossier.avisEncadrant}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default EncadrantDossierPage;