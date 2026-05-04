import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import WorkflowProgress from '../../components/stage/WorkflowProgress';
import stageService from '../../services/stageService';

const ACCES_DOCUMENTS = [
  'en_attente_admin', 'en_cours', 'journal_mi', 'journal_fin',
  'cloture_deposee', 'valide_encadrant', 'cloture', 'archive',
];

const EtudiantDashboard = () => {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stageService.monDossier()
      .then(res => setDossier(res.data.dossier))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Tableau de bord">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  const etudiant  = dossier?.etudiant;
  const encadrant = dossier?.encadrant;
  const stage     = dossier?.stage;
  const status    = dossier?.statusStage;

  const peutAccederDocuments = ACCES_DOCUMENTS.includes(status);
  const rejeteEncadrant = status === 'rejete' && !dossier?.idStage;
  const rejeteAdmin     = status === 'rejete' && !!dossier?.idStage;

  // typeCorrection : 'documents' | 'infos' | null
  // Centralisation de la logique — utilisée dans tout le Dashboard
  const typeCorrection       = dossier?.typeCorrection || null;
  const correctionDocuments  = rejeteAdmin && typeCorrection === 'documents';
  const correctionInfos      = rejeteAdmin && typeCorrection !== 'documents'; // 'infos' ou fallback

  const actions = [
    {
      condition: peutAccederDocuments || rejeteAdmin,
      to: '/etudiant/modeles',
      icon: 'bi-file-earmark-arrow-down',
      label: 'Télécharger les modèles',
      color: '#0057a8',
      desc: 'Téléchargez les modèles de documents à faire signer',
    },
    {
      condition: !status || rejeteEncadrant,
      to: '/etudiant/declarer',
      icon: 'bi-pencil-square',
      label: !status ? 'Déclarer mon stage' : 'Nouvelle demande de stage',
      color: '#003366',
      desc: !status
        ? 'Renseignez les informations de votre stage'
        : 'Votre demande précédente a été rejetée — soumettez une nouvelle demande',
    },
    {
      // CAS 2 uniquement : correction sur les informations → Corriger la déclaration
      condition: correctionInfos,
      to: '/etudiant/declarer',
      icon: 'bi-pencil-square',
      label: 'Corriger la déclaration',
      color: '#dc2626',
      desc: "Corrigez vos informations de déclaration suite au retour de l'administration",
    },
    {
      // CAS 1 uniquement : correction sur les documents → Déposer les documents
      condition: correctionDocuments,
      to: '/etudiant/documents',
      icon: 'bi-upload',
      label: 'Déposer les documents corrigés',
      color: '#dc2626',
      desc: 'Re-déposez les documents demandés par l\'administration',
    },
    {
      condition: status === 'en_attente_admin',
      to: '/etudiant/documents',
      icon: 'bi-upload',
      label: 'Déposer les documents',
      color: '#0057a8',
      desc: 'Uploadez convention, assurance et lettre (PDF)',
    },
    {
      condition: status === 'en_cours',
      to: '/etudiant/journal',
      icon: 'bi-journal-text',
      label: 'Saisir journal mi-stage',
      color: '#7c3aed',
      desc: 'Rédigez votre bilan de mi-stage',
    },
    {
      condition: status === 'journal_mi',
      to: '/etudiant/journal',
      icon: 'bi-journal-check',
      label: 'Saisir journal fin de stage',
      color: '#7c3aed',
      desc: 'Rédigez votre bilan de fin de stage',
    },
    {
      condition: status === 'journal_fin',
      to: '/etudiant/documents',
      icon: 'bi-file-earmark-check',
      label: 'Déposer docs de clôture',
      color: '#0057a8',
      desc: 'Uploadez attestation et rapport final',
    },
  ].filter(a => a.condition);

  // Destination du bouton "Corriger" selon typeCorrection
  const lienCorrection = correctionDocuments ? '/etudiant/documents' : '/etudiant/declarer';

  return (
    <Layout title="Tableau de bord Étudiant">

      {/* Alerte rejet ENCADRANT — style identique à DepotDocuments */}
      {rejeteEncadrant && (
        <div className="mb-4 rounded overflow-hidden" style={{ border: '2px solid #dc2626' }}>
          <div className="px-4 py-3 d-flex align-items-center gap-2"
            style={{ background: '#dc2626', color: '#fff' }}>
            <i className="bi bi-x-circle-fill fs-5"></i>
            <strong>Demande rejetée par votre encadrant</strong>
          </div>
          <div className="px-4 py-3" style={{ background: '#fff1f2' }}>
            {dossier?.motifRejet && (
              <div className="mb-3">
                <div className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>Motif du rejet :</div>
                <div className="p-3 rounded"
                  style={{ background: '#fff', border: '1px solid #fca5a5',
                           fontSize: '0.9rem', color: '#7f1d1d', fontStyle: 'italic' }}>
                  <i className="bi bi-chat-left-text me-2"></i>{dossier.motifRejet}
                </div>
              </div>
            )}
            <p className="mb-3" style={{ fontSize: '0.88rem', color: '#991b1b' }}>
              Vous devez soumettre une <strong>nouvelle déclaration de stage</strong> pour continuer.
            </p>
            <Link to="/etudiant/declarer" className="btn btn-danger btn-sm px-4">
              <i className="bi bi-pencil-square me-1"></i>Soumettre une nouvelle demande
            </Link>
          </div>
        </div>
      )}

      {/* Alerte rejet ADMIN — style identique à DepotDocuments, bouton selon typeCorrection */}
      {rejeteAdmin && (
        <div className="mb-4 rounded overflow-hidden" style={{ border: '2px solid #f59e0b' }}>
          <div className="px-4 py-3 d-flex align-items-center gap-2"
            style={{ background: '#f59e0b', color: '#fff' }}>
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <strong>Corrections demandées par l'administration</strong>
          </div>
          <div className="px-4 py-3" style={{ background: '#fffbeb' }}>
            {dossier?.motifRejet && (
              <div className="mb-3">
                <div className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>Motif :</div>
                <div className="p-3 rounded"
                  style={{ background: '#fff', border: '1px solid #fcd34d',
                           fontSize: '0.9rem', color: '#92400e', fontStyle: 'italic' }}>
                  <i className="bi bi-chat-left-text me-2"></i>{dossier.motifRejet}
                </div>
              </div>
            )}
            <p className="mb-3" style={{ fontSize: '0.88rem', color: '#92400e' }}>
              {correctionDocuments
                ? <>Re-déposez les documents corrigés dans <strong>Déposer documents</strong>.</>
                : <>Corrigez vos <strong>informations de déclaration</strong> ci-dessous.</>
              }
            </p>
            {correctionDocuments ? (
              <Link to="/etudiant/documents" className="btn btn-warning btn-sm px-4"
                style={{ color: '#78350f' }}>
                <i className="bi bi-upload me-1"></i>Déposer les documents corrigés
              </Link>
            ) : (
              <Link to="/etudiant/declarer" className="btn btn-warning btn-sm px-4"
                style={{ color: '#78350f' }}>
                <i className="bi bi-pencil me-1"></i>Corriger et resoumettre
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Alerte en attente encadrant */}
      {status === 'declare' && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-clock me-2"></i>
          <strong>En attente de réponse de votre encadrant.</strong>{' '}
          Vous recevrez une notification dès qu'il aura répondu.
          En l'absence de réponse dans les 24h, votre demande sera automatiquement validée.
        </div>
      )}

      {/* Alerte en attente admin */}
      {status === 'en_attente_admin' && (
        <div className="alert alert-info mb-4 d-flex align-items-start gap-2">
          <i className="bi bi-hourglass-split flex-shrink-0 mt-1"></i>
          <div>
            <strong>Dossier soumis à l'administration.</strong>{' '}
            Déposez vos documents en attendant la validation.
            <div className="mt-1" style={{ fontSize: '0.85rem' }}>
              Téléchargez les modèles depuis <strong>Modèles documents</strong>, faites-les signer, puis déposez-les dans <strong>Déposer documents</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Progression workflow */}
      <div className="card mb-4">
        <div className="card-header-custom">
          <i className="bi bi-diagram-3"></i> Progression de votre dossier
        </div>
        <div className="card-body">
          <WorkflowProgress status={status} />
          {/* Statut actuel visible clairement */}
          <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Statut actuel :</span>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      <div className="row g-4">

        {/* Mes informations */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header-custom">
              <i className="bi bi-person"></i> Mes informations
            </div>
            <div className="card-body" style={{ fontSize: '0.88rem' }}>
              {etudiant ? (
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>Nom complet</td>
                      <td className="fw-500">{etudiant.nomComplet}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Email</td>
                      <td>{etudiant.emailInstitutionnel}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">N° Apogée</td>
                      <td>{etudiant.numApogee}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Téléphone</td>
                      <td>{etudiant.telephone}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">CNE</td>
                      <td>{etudiant.CNE}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">CIN</td>
                      <td>{etudiant.CIN || <span className="text-muted fst-italic">Non renseigné</span>}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Niveau</td>
                      <td><span className="badge bg-primary">3ème Année</span></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">Données non disponibles.</p>
              )}
            </div>
          </div>
        </div>

        {/* Mon encadrant */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header-custom">
              <i className="bi bi-person-badge"></i> Mon encadrant pédagogique
            </div>
            <div className="card-body" style={{ fontSize: '0.88rem' }}>
              {encadrant ? (
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>Nom complet</td>
                      <td className="fw-500">{encadrant.nomComplet}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Email</td>
                      <td>{encadrant.emailInstitutionnel}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Téléphone</td>
                      <td>{encadrant.telephone}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Département</td>
                      <td>{encadrant.departement}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Filière</td>
                      <td>{encadrant.filiere}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">Encadrant non encore affecté.</p>
              )}
            </div>
          </div>
        </div>

        {/* Mon stage déclaré — enrichi */}
        {stage && (
          <div className="col-12">
            <div className="card">
              <div className="card-header-custom">
                <i className="bi bi-building"></i> Mon stage déclaré
              </div>
              <div className="card-body" style={{ fontSize: '0.88rem' }}>
                <div className="row">
                  <div className="col-md-6">
                    <p className="mb-1">
                      <span className="text-muted">Sujet : </span>
                      <strong>{stage.sujetStage}</strong>
                    </p>
                    <p className="mb-1">
                      <span className="text-muted">Période : </span>
                      {stage.periode}
                    </p>
                    <p className="mb-1">
                      <span className="text-muted">Année univ. : </span>
                      {dossier?.anneeUniversitaire || '—'}
                    </p>
                  </div>
                  <div className="col-md-6">
                    {stage.organisme && (
                      <>
                        <p className="mb-1">
                          <span className="text-muted">Organisme : </span>
                          <strong>{stage.organisme.raisonSociale}</strong>
                        </p>
                        <p className="mb-1">
                          <span className="text-muted">Secteur : </span>
                          {stage.organisme.secteur || '—'}
                        </p>
                        <p className="mb-1">
                          <span className="text-muted">Adresse : </span>
                          {stage.organisme.adresse}
                        </p>
                        <p className="mb-1">
                          <span className="text-muted">Responsable : </span>
                          {stage.organisme.nomCompletResponsable}
                        </p>
                        <p className="mb-1">
                          <span className="text-muted">Tél. responsable : </span>
                          {stage.organisme.telephoneResponsable}
                        </p>
                        <p className="mb-0">
                          <span className="text-muted">Email responsable : </span>
                          {stage.organisme.emailResponsable}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions disponibles */}
        {actions.length > 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-header-custom">
                <i className="bi bi-lightning"></i> Actions disponibles
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {actions.map((action, i) => (
                    <div key={i} className="col-md-4">
                      <Link to={action.to} className="text-decoration-none">
                        <div
                          className="p-3 rounded border d-flex gap-3 align-items-start h-100"
                          style={{ background: '#fafbfc', transition: 'all 0.2s', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fafbfc'}
                        >
                          <i className={`bi ${action.icon} fs-4`} style={{ color: action.color }}></i>
                          <div>
                            <div style={{ fontWeight: 600, color: action.color }}>
                              {action.label}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {action.desc}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default EtudiantDashboard;