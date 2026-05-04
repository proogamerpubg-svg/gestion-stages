import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import WorkflowProgress from '../../components/stage/WorkflowProgress';
import stageService from '../../services/stageService';
import { toast } from 'react-toastify';

/**
 * AdminDossier.js — Vue détaillée d'un dossier étudiant (Admin + Sys_Admin + Directeur)
 *
 * CORRECTIONS :
 *   1. Statuts corrigés : en_attente_validation → en_attente_admin
 *                         documents_cloture_deposes → valide_encadrant
 *   2. Section documents : cards modernes avec badge déposé/non déposé + télécharger
 *   3. Suppression bouton Rejeter dupliqué
 *   4. Suppression observationEncadrant1/2 (champs supprimés)
 *   5. Mode readOnly pour le Directeur (prop readOnly)
 */

// Tous les documents — admin voit TOUT
const TOUS_DOCS = [
  { key: 'convention',           label: 'Convention de stage',       icon: 'bi-file-earmark-text',  color: '#0057a8', bg: '#eff6ff', border: '#93c5fd', groupe: 'Préalables' },
  { key: 'assurance',            label: "Attestation d'assurance",   icon: 'bi-shield-check',       color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd', groupe: 'Préalables' },
  { key: 'lettreRecommandation', label: 'Lettre de recommandation',  icon: 'bi-envelope-paper',     color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc', groupe: 'Préalables' },
  { key: 'attestation',          label: 'Attestation de fin de stage', icon: 'bi-file-earmark-check', color: '#10b981', bg: '#f0fdf4', border: '#6ee7b7', groupe: 'Clôture' },
  { key: 'rapport',              label: 'Rapport de stage',          icon: 'bi-book',               color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', groupe: 'Clôture' },
];

const AdminDossier = ({ readOnly = false }) => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [dossier, setDossier]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [motif, setMotif]                     = useState('');
  const [typeCorrection, setTypeCorrection]   = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [showRejet, setShowRejet]             = useState(false);

  const charger = () => {
    // FIX : utiliser arrow functions pour éviter l'exécution immédiate de la Promise
    const fetchFn = readOnly
      ? () => stageService.voirDossierDir(id)
      : () => stageService.voirDossierAdmin(id);
    fetchFn()
      .then(res => setDossier(res.data.dossier))
      .catch(() => toast.error('Dossier introuvable.'))
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
      setMotif('');
      setTypeCorrection('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  };

  // Télécharger un document
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
    <Layout title="Dossier">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  if (!dossier) return (
    <Layout title="Dossier">
      <div className="alert alert-danger">Dossier introuvable.</div>
    </Layout>
  );

  const { etudiant, encadrant, stage } = dossier;
  const status = dossier.statusStage;

  // CORRECTION #1 : Statuts corrects (Doc v3 Partie 6)
  const peutValider      = status === 'en_attente_admin';       // CORRIGÉ : était 'en_attente_validation'
  const peutValiderFinal = status === 'valide_encadrant';       // CORRIGÉ : était 'documents_cloture_deposes'
  const peutRejeter      = ['en_attente_admin', 'cloture_deposee'].includes(status);
  const peutArchiver     = status === 'cloture';

  // Grouper les docs par phase
  const docsPrealables = TOUS_DOCS.filter(d => d.groupe === 'Préalables');
  const docsCloture    = TOUS_DOCS.filter(d => d.groupe === 'Clôture');

  // Retour selon le rôle
  const handleRetour = () => {
    if (readOnly) navigate('/directeur');
    else navigate('/admin');
  };

  return (
    <Layout title={`Dossier — ${etudiant?.nomComplet}`}>
      <div style={{ maxWidth: 900 }}>

        {/* ── Toolbar ── */}
        <div className="d-flex gap-2 mb-4 flex-wrap align-items-center">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleRetour}>
            <i className="bi bi-arrow-left me-1"></i>Retour
          </button>
          {readOnly && (
            <span style={{ display: 'none' }}></span>
          )}
        </div>

        {/* ── MESSAGE : en attente réponse encadrant (statut declare) ── */}
        {!readOnly && status === 'declare' && (
          <div className="card mb-4" style={{ border: '1px solid #bfdbfe', background: '#eff6ff' }}>
            <div className="card-body d-flex align-items-start gap-3 py-3">
              <i className="bi bi-hourglass-split mt-1 flex-shrink-0" style={{ color: '#1d4ed8', fontSize: '1.3rem' }}></i>
              <div>
                <div className="fw-600 mb-1" style={{ color: '#1d4ed8', fontSize: '0.92rem' }}>
                  En attente de la réponse de l'encadrant
                </div>
                <div style={{ fontSize: '0.83rem', color: '#1e40af' }}>
                  L'étudiant a soumis une demande de stage. L'encadrant a été notifié par email.
                  Vous pourrez valider ou rejeter ce dossier une fois que l'encadrant aura confirmé son accord.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION ACTIONS ADMIN ── */}
        {!readOnly && (peutValider || peutValiderFinal || peutRejeter || peutArchiver) && (
          <div className="card mb-4" style={{ border: '1px solid #d1d5db' }}>
            <div className="card-header-custom" style={{ background: '#f8fafc', color: '#374151' }}>
              <i className="bi bi-gear me-2"></i>Actions sur le dossier
            </div>
            <div className="card-body">
              {/* Message explicatif */}
              <div className="mb-3 p-2 rounded" style={{ background: '#fefce8', border: '1px solid #fde047', fontSize: '0.82rem', color: '#713f12' }}>
                <i className="bi bi-info-circle me-1"></i>
                Vérifiez les informations et les documents avant de décider. Une validation est définitive.
                En cas de rejet, choisissez le <strong>type de correction attendu</strong> : correction sur les
                <strong> documents déposés</strong> (ex: signature manquante) ou sur les
                <strong> informations de la déclaration</strong> (ex: dates incorrectes).
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {peutValider && (
                  <button className="btn btn-sm btn-success" disabled={submitting}
                    onClick={() => action(() => stageService.valider(id), 'Dossier validé ! Stage officiellement en cours.')}>
                    <i className="bi bi-check-lg me-1"></i>Valider le dossier
                  </button>
                )}
                {peutValiderFinal && (
                  <button className="btn btn-sm btn-success" disabled={submitting}
                    onClick={() => action(() => stageService.validerFinal(id), 'Stage clôturé officiellement !')}>
                    <i className="bi bi-award me-1"></i>Validation finale
                  </button>
                )}
                {peutRejeter && (
                  <button className="btn btn-sm btn-danger" onClick={() => setShowRejet(!showRejet)}>
                    <i className="bi bi-x-lg me-1"></i>Rejeter le dossier
                  </button>
                )}
                {peutArchiver && (
                  <button className="btn btn-sm btn-secondary" disabled={submitting}
                    onClick={() => action(() => stageService.archiver(id), 'Dossier archivé avec succès.')}>
                    <i className="bi bi-archive me-1"></i>Archiver
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Formulaire rejet avec type de correction ── */}
        {showRejet && !readOnly && (
          <div className="card mb-4" style={{ border: '2px solid #fca5a5' }}>
            <div className="card-header-custom" style={{ background: '#fef2f2', color: '#991b1b' }}>
              <i className="bi bi-x-circle me-2"></i>Rejeter le dossier — Préciser la correction
            </div>
            <div className="card-body">

              {/* Type de correction */}
              <div className="mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.88rem' }}>
                  Type de correction demandée <span className="text-danger">*</span>
                </label>
                <div className="d-flex gap-3 flex-wrap">
                  <label
                    className="d-flex align-items-center gap-2 p-3 rounded cursor-pointer"
                    style={{
                      border: `2px solid ${typeCorrection === 'documents' ? '#dc2626' : '#e2e8f0'}`,
                      background: typeCorrection === 'documents' ? '#fef2f2' : '#f8fafc',
                      cursor: 'pointer', flex: 1, minWidth: 200,
                    }}
                  >
                    <input type="radio" name="typeCorrection" value="documents"
                      checked={typeCorrection === 'documents'}
                      onChange={e => setTypeCorrection(e.target.value)} />
                    <div>
                      <div className="fw-600" style={{ fontSize: '0.88rem' }}>
                        <i className="bi bi-file-earmark-x me-1 text-danger"></i>Correction sur les documents
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        L'étudiant doit re-déposer un ou plusieurs documents (ex: signature manquante)
                      </div>
                    </div>
                  </label>
                  <label
                    className="d-flex align-items-center gap-2 p-3 rounded"
                    style={{
                      border: `2px solid ${typeCorrection === 'infos' ? '#dc2626' : '#e2e8f0'}`,
                      background: typeCorrection === 'infos' ? '#fef2f2' : '#f8fafc',
                      cursor: 'pointer', flex: 1, minWidth: 200,
                    }}
                  >
                    <input type="radio" name="typeCorrection" value="infos"
                      checked={typeCorrection === 'infos'}
                      onChange={e => setTypeCorrection(e.target.value)} />
                    <div>
                      <div className="fw-600" style={{ fontSize: '0.88rem' }}>
                        <i className="bi bi-pencil-square me-1 text-danger"></i>Correction sur les informations
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        L'étudiant doit modifier les informations de sa déclaration de stage
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Motif */}
              <div className="mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.88rem' }}>
                  Motif de rejet <span className="text-danger">*</span>
                </label>
                <p className="text-muted mb-2" style={{ fontSize: '0.82rem' }}>
                  <i className="bi bi-pencil me-1"></i>
                  Expliquez précisément pourquoi vous rejetez ce dossier afin que l'étudiant sache quoi corriger.
                </p>
                <textarea
                  className="form-control" rows={3}
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  placeholder="Ex : L'attestation d'assurance déposée ne contient pas la signature de l'organisme. Veuillez re-déposer une version signée."
                />
                <small className="text-muted">{motif.length}/20 caractères minimum</small>
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-danger btn-sm"
                  disabled={motif.length < 20 || !typeCorrection || submitting}
                  onClick={() => action(
                    () => stageService.rejeter(id, motif, typeCorrection),
                    "Dossier rejeté. L'étudiant a été notifié."
                  )}
                >
                  <i className="bi bi-send me-1"></i>Confirmer le rejet
                </button>
                <button className="btn btn-outline-secondary btn-sm"
                  onClick={() => { setShowRejet(false); setMotif(''); setTypeCorrection(''); }}>
                  Annuler
                </button>
              </div>
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

          {/* ── Étudiant ── */}
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header-custom">
                <i className="bi bi-person"></i> Étudiant
              </div>
              <div className="card-body" style={{ fontSize: '0.85rem' }}>
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr><td className="text-muted" style={{width:'42%'}}>Nom complet</td><td><strong>{etudiant?.nomComplet}</strong></td></tr>
                    <tr><td className="text-muted">Email</td><td>{etudiant?.emailInstitutionnel}</td></tr>
                    <tr><td className="text-muted">N° Apogée</td><td>{etudiant?.numApogee}</td></tr>
                    <tr><td className="text-muted">Téléphone</td><td>{etudiant?.telephone}</td></tr>
                    <tr><td className="text-muted">CNE</td><td>{etudiant?.CNE}</td></tr>
                    <tr><td className="text-muted">CIN</td><td>{etudiant?.CIN || <span className="text-muted fst-italic">Non renseigné</span>}</td></tr>
                    <tr><td className="text-muted">Niveau</td><td><span className="badge bg-primary" style={{fontSize:'0.72rem'}}>3ème Année</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Encadrant ── */}
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header-custom">
                <i className="bi bi-person-badge"></i> Encadrant
              </div>
              <div className="card-body" style={{ fontSize: '0.85rem' }}>
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr><td className="text-muted" style={{width:'42%'}}>Nom complet</td><td><strong>{encadrant?.nomComplet}</strong></td></tr>
                    <tr><td className="text-muted">Email</td><td>{encadrant?.emailInstitutionnel}</td></tr>
                    <tr><td className="text-muted">Téléphone</td><td>{encadrant?.telephone || <span className="text-muted fst-italic">—</span>}</td></tr>
                    <tr><td className="text-muted">Département</td><td>{encadrant?.departement}</td></tr>
                    <tr><td className="text-muted">Filière</td><td>{encadrant?.filiere || <span className="text-muted fst-italic">—</span>}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Stage ── */}
          {stage && (
            <div className="col-12">
              <div className="card">
                <div className="card-header-custom">
                  <i className="bi bi-briefcase"></i> Stage déclaré
                </div>
                <div className="card-body" style={{ fontSize: '0.85rem' }}>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          <tr><td className="text-muted" style={{width:'45%'}}>Sujet</td><td><strong>{stage.sujetStage}</strong></td></tr>
                          <tr><td className="text-muted">Période</td><td>{stage.periode}</td></tr>
                          <tr><td className="text-muted">Année univ.</td><td>{dossier.anneeUniversitaire || <span className="text-muted fst-italic">—</span>}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          <tr><td className="text-muted" style={{width:'45%'}}>Organisme</td><td><strong>{stage.organisme?.raisonSociale}</strong></td></tr>
                          <tr><td className="text-muted">Type</td><td>
                            {stage.organisme?.type === 'public'
                              ? <span className="badge" style={{background:'#dbeafe',color:'#1d4ed8',fontSize:'0.72rem'}}>Public</span>
                              : <span className="badge" style={{background:'#fef3c7',color:'#92400e',fontSize:'0.72rem'}}>Privé</span>}
                          </td></tr>
                          <tr><td className="text-muted">Secteur</td><td>{stage.organisme?.secteur || <span className='text-muted fst-italic'>—</span>}</td></tr>
                          <tr><td className="text-muted">Adresse</td><td>{stage.organisme?.adresse}</td></tr>
                          <tr><td className="text-muted">Responsable</td><td>{stage.organisme?.nomCompletResponsable}</td></tr>
                          <tr><td className="text-muted">Tél. responsable</td><td>{stage.organisme?.telephoneResponsable || <span className="text-muted fst-italic">—</span>}</td></tr>
                          <tr><td className="text-muted">Email responsable</td><td>{stage.organisme?.emailResponsable || <span className="text-muted fst-italic">—</span>}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              CORRECTION #2 — Section Documents : cards modernes
              Admin voit TOUS les documents (préalables + clôture)
              Chaque document : badge déposé/non déposé + télécharger
          ═══════════════════════════════════════════════════ */}
          {stage && (
            <div className="col-12">
              <div className="card">
                <div className="card-header-custom">
                  <i className="bi bi-folder2-open me-2"></i>Documents du dossier
                </div>
                <div className="card-body">

                  {/* Documents préalables */}
                  <h6 className="mb-3" style={{ color: '#003366', fontWeight: 600, fontSize: '0.88rem' }}>
                    <i className="bi bi-paperclip me-1"></i>Documents préalables
                  </h6>
                  <div className="row g-3 mb-4">
                    {docsPrealables.map(doc => {
                      const fichier = stage[doc.key];
                      const depose  = !!fichier;
                      return (
                        <div key={doc.key} className="col-md-4">
                          <div
                            className="d-flex align-items-center gap-3 p-3 rounded h-100"
                            style={{
                              border: `1px solid ${depose ? doc.border : '#e2e8f0'}`,
                              background: depose ? doc.bg : '#f8fafc',
                            }}
                          >
                            <div
                              className="d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{
                                width: 44, height: 44, borderRadius: 10,
                                background: depose ? doc.color + '18' : '#e2e8f0',
                              }}
                            >
                              <i className={`bi ${doc.icon}`}
                                style={{ fontSize: '1.3rem', color: depose ? doc.color : '#94a3b8' }}
                              ></i>
                            </div>
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{doc.label}</div>
                              <div className="mt-1">
                                {depose ? (
                                  <span className="badge"
                                    style={{ background: doc.color + '18', color: doc.color, fontSize: '0.68rem', padding: '2px 7px' }}>
                                    <i className="bi bi-check-circle-fill me-1"></i>Déposé
                                  </span>
                                ) : (
                                  <span className="badge"
                                    style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.68rem', padding: '2px 7px' }}>
                                    <i className="bi bi-dash-circle me-1"></i>Non déposé
                                  </span>
                                )}
                              </div>
                            </div>
                            {depose && (
                              <button
                                className="btn btn-sm flex-shrink-0"
                                style={{ background: doc.color, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem' }}
                                onClick={() => telecharger(fichier, `${doc.label}.pdf`)}
                                title="Télécharger"
                              >
                                <i className="bi bi-download"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Documents de clôture */}
                  <h6 className="mb-3" style={{ color: '#003366', fontWeight: 600, fontSize: '0.88rem' }}>
                    <i className="bi bi-archive me-1"></i>Documents de clôture
                  </h6>
                  <div className="row g-3">
                    {docsCloture.map(doc => {
                      const fichier = stage[doc.key];
                      const depose  = !!fichier;
                      return (
                        <div key={doc.key} className="col-md-6">
                          <div
                            className="d-flex align-items-center gap-3 p-3 rounded h-100"
                            style={{
                              border: `1px solid ${depose ? doc.border : '#e2e8f0'}`,
                              background: depose ? doc.bg : '#f8fafc',
                            }}
                          >
                            <div
                              className="d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{
                                width: 44, height: 44, borderRadius: 10,
                                background: depose ? doc.color + '18' : '#e2e8f0',
                              }}
                            >
                              <i className={`bi ${doc.icon}`}
                                style={{ fontSize: '1.3rem', color: depose ? doc.color : '#94a3b8' }}
                              ></i>
                            </div>
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{doc.label}</div>
                              <div className="mt-1">
                                {depose ? (
                                  <span className="badge"
                                    style={{ background: doc.color + '18', color: doc.color, fontSize: '0.68rem', padding: '2px 7px' }}>
                                    <i className="bi bi-check-circle-fill me-1"></i>Déposé
                                  </span>
                                ) : (
                                  <span className="badge"
                                    style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.68rem', padding: '2px 7px' }}>
                                    <i className="bi bi-dash-circle me-1"></i>Non déposé
                                  </span>
                                )}
                              </div>
                            </div>
                            {depose && (
                              <button
                                className="btn btn-sm flex-shrink-0"
                                style={{ background: doc.color, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem' }}
                                onClick={() => telecharger(fichier, `${doc.label}.pdf`)}
                                title="Télécharger"
                              >
                                <i className="bi bi-download"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong className="text-primary">Journal mi-stage (étudiant) :</strong>
                      <p className="mt-1 mb-0">{dossier.mission1}</p>
                    </div>
                  )}
                  {dossier.reponseMission1 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <strong>Commentaire encadrant — mi-stage :</strong>
                      <p className="mt-1 mb-0">{dossier.reponseMission1}</p>
                    </div>
                  )}
                  {dossier.mission2 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong className="text-primary">Journal fin de stage (étudiant) :</strong>
                      <p className="mt-1 mb-0">{dossier.mission2}</p>
                    </div>
                  )}
                  {dossier.reponseMission2 && (
                    <div className="mb-3 p-3 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <strong>Commentaire encadrant — fin de stage :</strong>
                      <p className="mt-1 mb-0">{dossier.reponseMission2}</p>
                    </div>
                  )}
                  {dossier.avisEncadrant && (
                    <div className="p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <strong>Avis pédagogique final (encadrant) :</strong>
                      <p className="mt-1 mb-0">{dossier.avisEncadrant}</p>
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

export default AdminDossier;