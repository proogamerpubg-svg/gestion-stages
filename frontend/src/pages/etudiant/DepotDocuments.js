import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import documentService from '../../services/documentService';
import stageService from '../../services/stageService';
import { toast } from 'react-toastify';

const DOCS_PREALABLES = [
  { key: 'convention',           label: 'Convention de stage',      desc: 'Signée par l\'organisme et l\'ENCG', icon: 'bi-file-earmark-text', requis: true },
  { key: 'assurance',            label: 'Attestation d\'assurance', desc: 'Responsabilité civile',              icon: 'bi-shield-check',      requis: true },
  { key: 'lettreRecommandation', label: 'Lettre de recommandation', desc: 'Lettre ENCG à l\'organisme',        icon: 'bi-envelope-paper',    requis: true },
];

const DOCS_CLOTURE = [
  { key: 'attestation', label: 'Attestation de fin de stage', desc: 'Délivrée par l\'organisme',     icon: 'bi-award', requis: true },
  { key: 'rapport',     label: 'Rapport final de stage',      desc: 'Rapport rédigé par l\'étudiant', icon: 'bi-book',  requis: true },
];

const UploadCard = ({ doc, stage, phaseKey, loading, onUpload, peutReDeposer = false }) => {
  const dejaDepose    = stage?.[doc.key];
  const [fichier, setFichier] = useState(null);
  const afficherInput = !dejaDepose || peutReDeposer;

  const handleUpload = async () => {
    if (!fichier) return toast.warning('Sélectionnez un fichier PDF.');
    await onUpload(doc.key, fichier, phaseKey);
    setFichier(null);
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex gap-3 align-items-start">
          <i className={`bi ${doc.icon} fs-2`} style={{ color: dejaDepose ? '#16a34a' : '#003366' }}></i>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-1">
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{doc.label}</strong>
                {doc.requis && <span className="text-danger ms-1">*</span>}
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{doc.desc}</div>
              </div>
              {dejaDepose
                ? <span className="badge bg-success"><i className="bi bi-check me-1"></i>Déposé</span>
                : <span className="badge bg-warning text-dark"><i className="bi bi-clock me-1"></i>En attente</span>
              }
            </div>
            {afficherInput && (
              <div className="d-flex gap-2 mt-2">
                <input
                  type="file"
                  accept=".pdf"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 300 }}
                  onChange={e => setFichier(e.target.files[0])}
                />
                <button
                  className="btn btn-encg btn-sm"
                  onClick={handleUpload}
                  disabled={loading || !fichier}
                >
                  {loading
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-upload me-1"></i>{dejaDepose ? 'Remplacer' : 'Déposer'}</>}
                </button>
              </div>
            )}
            {dejaDepose && !peutReDeposer && (
              <div className="mt-1 text-success" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-check-circle me-1"></i>Document déposé avec succès.
              </div>
            )}
            {dejaDepose && peutReDeposer && (
              <div className="mt-1 text-warning" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-exclamation-circle me-1"></i>Vous pouvez remplacer ce document si nécessaire.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DepotDocuments = () => {
  const navigate = useNavigate();
  const [dossier, setDossier]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [loadInit, setLoadInit]     = useState(true);
  const [soumettant, setSoumettant] = useState(false);

  const chargerDossier = () => {
    stageService.monDossier()
      .then(res => setDossier(res.data.dossier))
      .finally(() => setLoadInit(false));
  };

  useEffect(() => { chargerDossier(); }, []);

  const handleUpload = async (typeDocument, fichier, phase) => {
    setLoading(true);
    try {
      const appelerService = phase === 'cloture'
        ? () => documentService.uploadCloture(typeDocument, fichier)
        : () => documentService.uploadDocument(typeDocument, fichier);

      await appelerService();
      toast.success(`Document "${typeDocument}" déposé avec succès.`);
      chargerDossier();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du dépôt.');
    } finally {
      setLoading(false);
    }
  };

  // Bouton "Soumettre la correction" — notifie l'admin que les documents sont corrigés
  const soumettreCorrection = async () => {
    setSoumettant(true);
    try {
      await documentService.validerCorrectionDocuments();
      toast.success('Correction soumise ! L\'administration a été notifiée.');
      chargerDossier();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSoumettant(false);
    }
  };

  if (loadInit) return (
    <Layout title="Dépôt de documents">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  const status = dossier?.statusStage;
  const stage  = dossier?.stage;

  const rejeteAdmin     = status === 'rejete' && !!dossier?.idStage;
  const rejeteEncadrant = status === 'rejete' && !dossier?.idStage;
  const phasePre        = status === 'en_attente_admin' || rejeteAdmin;
  const phaseCloture    = status === 'journal_fin' || status === 'cloture_deposee';

  // typeCorrection centralisé — même logique que Dashboard et DeclarerStage
  const typeCorrection      = dossier?.typeCorrection || null;
  const correctionDocuments = rejeteAdmin && typeCorrection === 'documents';
  const correctionInfos     = rejeteAdmin && typeCorrection !== 'documents';

  // CAS 2 (correction infos) : l'étudiant ne doit PAS uploader — upload désactivé
  // CAS 1 (correction documents) : upload autorisé + remplacement activé
  const uploadAutorise = !correctionInfos;

  // Pour le bouton "Soumettre la correction" : tous les docs doivent être déposés
  const tousDeposes = stage?.convention && stage?.assurance && stage?.lettreRecommandation;

  return (
    <Layout title="Dépôt de documents">
      <div style={{ maxWidth: 700 }}>

        {/* ── Style uniforme alerte rejet ENCADRANT ── */}
        {rejeteEncadrant && (
          <div className="mb-4 rounded overflow-hidden" style={{ border: '2px solid #dc2626' }}>
            <div className="px-4 py-3 d-flex align-items-center gap-2" style={{ background: '#dc2626', color: '#fff' }}>
              <i className="bi bi-x-circle-fill fs-5"></i>
              <strong>Demande rejetée par votre encadrant</strong>
            </div>
            <div className="px-4 py-3" style={{ background: '#fff1f2' }}>
              {dossier?.motifRejet && (
                <div className="mb-3">
                  <div className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>Motif du rejet :</div>
                  <div className="p-3 rounded" style={{ background: '#fff', border: '1px solid #fca5a5', fontSize: '0.9rem', color: '#7f1d1d', fontStyle: 'italic' }}>
                    <i className="bi bi-chat-left-text me-2"></i>{dossier.motifRejet}
                  </div>
                </div>
              )}
              <p className="mb-3" style={{ fontSize: '0.88rem', color: '#991b1b' }}>
                Vous devez soumettre une <strong>nouvelle déclaration de stage</strong> pour continuer.
              </p>
              <a href="/etudiant/declarer" className="btn btn-danger btn-sm px-4">
                <i className="bi bi-pencil-square me-1"></i>Soumettre une nouvelle demande
              </a>
            </div>
          </div>
        )}

        {/* ── Style uniforme alerte rejet ADMIN ── */}
        {rejeteAdmin && dossier?.motifRejet && correctionDocuments && (
          <div className="mb-4 rounded overflow-hidden" style={{ border: '2px solid #f59e0b' }}>
            <div className="px-4 py-3 d-flex align-items-center gap-2" style={{ background: '#f59e0b', color: '#fff' }}>
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <strong>Corrections demandées par l'administration</strong>
            </div>
            <div className="px-4 py-3" style={{ background: '#fffbeb' }}>
              <div className="mb-3">
                <div className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>Motif :</div>
                <div className="p-3 rounded" style={{ background: '#fff', border: '1px solid #fcd34d', fontSize: '0.9rem', color: '#92400e', fontStyle: 'italic' }}>
                  <i className="bi bi-chat-left-text me-2"></i>{dossier.motifRejet}
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#92400e' }}>
                Re-déposez les documents corrigés ci-dessous, puis cliquez sur <strong>"Soumettre la correction"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Aucune phase active */}
        {!phasePre && !phaseCloture && !rejeteEncadrant && (
          <div className="p-4 rounded d-flex align-items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderLeft: '5px solid #f59e0b' }}>
            <i className="bi bi-hourglass-split flex-shrink-0 mt-1" style={{ color: '#d97706', fontSize: '1.4rem' }}></i>
            <div>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>
                Dépôt de documents non disponible pour l'instant
              </strong>
              <p className="mb-2 mt-1" style={{ fontSize: '0.88rem', color: '#78350f' }}>
                Vous pourrez déposer vos documents <strong>uniquement après que votre encadrant pédagogique ait accepté votre demande</strong>.
              </p>
              {status && (
                <div className="mt-2" style={{ fontSize: '0.82rem', color: '#92400e' }}>
                  Statut actuel : <strong>{status}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phase préalable ── */}
        {phasePre && (
          <>
            {/* CAS 2 : correction infos → afficher avertissement, désactiver upload */}
            {correctionInfos && (
              <div className="mb-4 p-3 rounded d-flex align-items-start gap-3"
                style={{ background: '#fef9c3', border: '1px solid #fde047', borderLeft: '5px solid #f59e0b' }}>
                <i className="bi bi-lock-fill flex-shrink-0 mt-1" style={{ color: '#d97706', fontSize: '1.2rem' }}></i>
                <div>
                  <strong style={{ color: '#92400e' }}>Dépôt de documents désactivé</strong>
                  <p className="mb-2 mt-1" style={{ fontSize: '0.88rem', color: '#78350f' }}>
                    La correction demandée concerne vos <strong>informations de déclaration</strong>,
                    pas vos documents. Vous ne pouvez pas modifier les documents pour cette correction.
                  </p>
                  <a href="/etudiant/declarer" className="btn btn-warning btn-sm px-3"
                    style={{ color: '#78350f' }}>
                    <i className="bi bi-pencil me-1"></i>Aller à Corriger la déclaration
                  </a>
                </div>
              </div>
            )}
            <div className="info-box mb-4">
              <i className="bi bi-arrow-down-circle me-2"></i>
              Déposez les <strong>3 documents préalables</strong> en format PDF.
              {correctionDocuments
                ? ' Re-déposez les documents corrigés, puis cliquez sur "Soumettre la correction".'
                : correctionInfos
                ? ' Consultez vos informations de déclaration pour la correction requise.'
                : ' Une fois les 3 déposés, cliquez sur "Soumettre le dossier".'
              }
            </div>
            <h6 className="mb-3" style={{ fontWeight: 600 }}>Documents préalables</h6>
            {DOCS_PREALABLES.map(doc => (
              <UploadCard
                key={doc.key}
                doc={doc}
                stage={stage}
                phaseKey="prealable"
                loading={loading}
                onUpload={handleUpload}
                peutReDeposer={correctionDocuments}
              />
            ))}

            {/* Bouton Soumettre — différent selon le cas */}
            <div className="mt-4">
              {correctionDocuments ? (
                // CAS 1 : correction documents → bouton "Soumettre la correction"
                <button
                  className="btn btn-warning px-4 fw-600"
                  disabled={!tousDeposes || soumettant}
                  onClick={soumettreCorrection}
                  style={{ color: '#78350f' }}
                >
                  {soumettant
                    ? <><span className="spinner-border spinner-border-sm me-2" />Soumission...</>
                    : <><i className="bi bi-send-check me-2"></i>Soumettre la correction</>
                  }
                </button>
              ) : (
                // Cas normal : soumettre le dossier complet
                tousDeposes && (
                  <div className="p-3 rounded d-flex align-items-center gap-3" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                    <i className="bi bi-check-circle-fill text-success fs-4"></i>
                    <div>
                      <div className="fw-600 text-success">Tous les documents sont déposés !</div>
                      <div style={{ fontSize: '0.83rem', color: '#166534' }}>
                        Votre dossier est soumis à l'administration pour validation.
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* ── Phase clôture ── */}
        {phaseCloture && (
          <>
            <div className="info-box mb-4">
              <i className="bi bi-award me-2"></i>
              Déposez vos <strong>documents de clôture</strong>.
              Une fois déposés, votre encadrant pourra émettre son avis pédagogique final.
            </div>
            <h6 className="mb-3" style={{ fontWeight: 600 }}>Documents de clôture</h6>
            {DOCS_CLOTURE.map(doc => (
              <UploadCard
                key={doc.key}
                doc={doc}
                stage={stage}
                phaseKey="cloture"
                loading={loading}
                onUpload={handleUpload}
              />
            ))}
          </>
        )}

        <button className="btn btn-outline-secondary mt-3" onClick={() => navigate('/etudiant')}>
          <i className="bi bi-arrow-left me-2"></i>Retour
        </button>
      </div>
    </Layout>
  );
};

export default DepotDocuments;