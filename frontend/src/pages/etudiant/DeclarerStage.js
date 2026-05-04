import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import stageService from '../../services/stageService';
import api from '../../services/api';
import { toast } from 'react-toastify';

// ─────────────────────────────────────────────────────────────────────────────
// DateSelecteur — 3 selects (Mois / Jour / Année fixe)
// Même comportement que la version corrigée précédente
// ─────────────────────────────────────────────────────────────────────────────
const MOIS_AUTORISES = [
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
];

const joursParMois = (mois, annee) => {
  const jours31 = [1, 3, 5, 7, 8, 10, 12];
  if (mois === 2) return annee % 4 === 0 ? 29 : 28;
  return jours31.includes(mois) ? 31 : 30;
};

const DateSelecteur = ({ label, name, value, onChange, annee, required }) => {
  const parse = (v) => {
    if (!v) return { jour: '', mois: '' };
    const parts = v.split('-');
    return {
      jour: parts[2] ? parseInt(parts[2], 10) : '',
      mois: parts[1] ? parseInt(parts[1], 10) : '',
    };
  };

  const [jour, setJour] = useState(() => parse(value).jour);
  const [mois, setMois] = useState(() => parse(value).mois);

  useEffect(() => {
    const { jour: j, mois: m } = parse(value);
    setJour(j);
    setMois(m);
  }, [value]);

  const nbJours = mois ? joursParMois(mois, annee) : 31;

  const construire = (j, m) => {
    if (!j || !m || !annee) return '';
    return `${annee}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
  };

  const handleMois = e => {
    const m   = parseInt(e.target.value, 10) || '';
    const max = m ? joursParMois(m, annee) : 31;
    const j   = jour && jour <= max ? jour : '';
    setMois(m);
    setJour(j);
    onChange({ target: { name, value: construire(j, m) } });
  };

  const handleJour = e => {
    const j = parseInt(e.target.value, 10) || '';
    setJour(j);
    onChange({ target: { name, value: construire(j, mois) } });
  };

  return (
    <div>
      <label className="form-label fw-500">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="d-flex gap-2">
        {/* Mois — uniquement juin, juillet, août */}
        <select
          className="form-select"
          value={mois}
          onChange={handleMois}
          required={required}
          style={{ minWidth: 0 }}
        >
          <option value="">— Mois —</option>
          {MOIS_AUTORISES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Jour — adaptatif selon le mois */}
        <select
          className="form-select"
          style={{ width: '100px', flexShrink: 0 }}
          value={jour}
          onChange={handleJour}
          required={required}
        >
          <option value="">— Jour —</option>
          {Array.from({ length: nbJours }, (_, i) => i + 1).map(j => (
            <option key={j} value={j}>{String(j).padStart(2, '0')}</option>
          ))}
        </select>

        {/* Année — affichage fixe, non modifiable */}
        <input
          type="text"
          className="form-control"
          style={{ width: '85px', flexShrink: 0, background: '#f1f5f9',
                   cursor: 'not-allowed', color: '#374151', fontWeight: 500 }}
          value={annee || '—'}
          readOnly
          tabIndex={-1}
          title="L'année est fixée automatiquement par le serveur"
        />
      </div>
    </div>
  );
};

const DeclarerStage = () => {
  const navigate = useNavigate();
  const [loading,      setLoading]      = useState(false);
  const [dossier,      setDossier]      = useState(null);
  const [pageReady,    setPageReady]    = useState(false);
  const [erreurDate,   setErreurDate]   = useState('');
  const [anneeServeur, setAnneeServeur] = useState(null);

  const [form, setForm] = useState({
    sujetStage:            '',
    dateDebut:             '',
    dateFin:               '',
    raisonSociale:         '',
    adresse:               '',
    secteur:               '',
    typeOrganisme:         'prive',
    nomCompletResponsable: '',
    telephoneResponsable:  '',
    emailResponsable:      '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/annee-courante'),
      stageService.monDossier(),
    ]).then(([resAnnee, resDossier]) => {
      setAnneeServeur(resAnnee.data.annee);
      const d = resDossier.data.dossier;
      setDossier(d);
      const rejeteAdmin = d?.statusStage === 'rejete' && !!d?.idStage;
      if (rejeteAdmin && d?.stage) {
        setForm({
          sujetStage:            d.stage.sujetStage                       || '',
          dateDebut:             d.dateDebut                              || '',
          dateFin:               d.dateFin                                || '',
          raisonSociale:         d.stage.organisme?.raisonSociale         || '',
          adresse:               d.stage.organisme?.adresse               || '',
          secteur:               d.stage.organisme?.secteur               || '',
          typeOrganisme:         d.stage.organisme?.type                  || 'prive',
          nomCompletResponsable: d.stage.organisme?.nomCompletResponsable || '',
          telephoneResponsable:  d.stage.organisme?.telephoneResponsable  || '',
          emailResponsable:      d.stage.organisme?.emailResponsable      || '',
        });
      }
    }).catch(() => {
      setAnneeServeur(new Date().getFullYear());
    }).finally(() => setPageReady(true));
  }, []);

  const validerDates = (dateDebut, dateFin) => {
    if (!dateDebut || !dateFin || !anneeServeur) return '';
    const debut = new Date(dateDebut);
    const fin   = new Date(dateFin);
    if (debut.getFullYear() !== anneeServeur || fin.getFullYear() !== anneeServeur) {
      return `Le stage doit se dérouler en ${anneeServeur}.`;
    }
    if (fin <= debut) return 'La date de fin doit être postérieure à la date de début.';
    const periodeDebut = new Date(`${anneeServeur}-06-01`);
    const periodeFin   = new Date(`${anneeServeur}-08-31`);
    if (debut < periodeDebut || fin > periodeFin) {
      return `La période doit se situer entre le 01/06/${anneeServeur} et le 31/08/${anneeServeur}.`;
    }
    const diffJours = Math.round((fin - debut) / (1000 * 60 * 60 * 24));
    if (diffJours !== 29 && diffJours !== 30) {
      return `Durée invalide (${diffJours} jours). Le stage doit durer exactement 29 ou 30 jours.`;
    }
    return '';
  };

  const handleChange = e => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (e.target.name === 'dateDebut' || e.target.name === 'dateFin') {
      setErreurDate(validerDates(
        e.target.name === 'dateDebut' ? e.target.value : updated.dateDebut,
        e.target.name === 'dateFin'   ? e.target.value : updated.dateFin,
      ));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const erreur = validerDates(form.dateDebut, form.dateFin);
    if (erreur) return toast.error(erreur);
    setLoading(true);
    try {
      const rejeteAdmin = dossier?.statusStage === 'rejete' && !!dossier?.idStage;
      if (rejeteAdmin) {
        await stageService.modifier(form);
        toast.success('Dossier corrigé et resoumis avec succès !');
      } else {
        await stageService.declarer(form);
        toast.success('Stage déclaré avec succès ! Votre encadrant a été notifié.');
      }
      navigate('/etudiant');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la déclaration.');
    } finally {
      setLoading(false);
    }
  };

  const rejeteAdmin     = dossier?.statusStage === 'rejete' && !!dossier?.idStage;
  const rejeteEncadrant = dossier?.statusStage === 'rejete' && !dossier?.idStage;
  const typeCorrection      = dossier?.typeCorrection || null;
  const correctionDocuments = rejeteAdmin && typeCorrection === 'documents';
  const correctionInfos     = rejeteAdmin && typeCorrection !== 'documents';

  const pageTitle = rejeteAdmin
    ? (correctionDocuments ? 'Correction de documents' : 'Corriger la déclaration')
    : rejeteEncadrant ? 'Nouvelle demande de stage' : 'Déclarer mon stage';

  if (!pageReady) return (
    <Layout title="Déclarer mon stage">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  // ── CAS 1 : correction documents → bloquer formulaire, afficher message ──
  if (correctionDocuments) {
    return (
      <Layout title="Correction de documents">
        <div style={{ maxWidth: 800 }}>
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
              <div className="p-3 rounded d-flex align-items-start gap-2 mb-3"
                style={{ background: '#fef9c3', border: '1px solid #fde047', fontSize: '0.9rem', color: '#713f12' }}>
                <i className="bi bi-info-circle-fill flex-shrink-0 mt-1"></i>
                <span>
                  Des corrections ont été demandées sur vos <strong>documents</strong>.
                  Veuillez déposer les documents corrigés dans la section{' '}
                  <strong>"Déposer documents"</strong>.
                  Le formulaire de déclaration n'est pas concerné.
                </span>
              </div>
              <a href="/etudiant/documents" className="btn btn-warning btn-sm px-4"
                style={{ color: '#78350f' }}>
                <i className="bi bi-upload me-2"></i>Aller à Déposer documents
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── CAS normal / CAS 2 (correction infos) : afficher formulaire ──
  return (
    <Layout title={pageTitle}>
      <div style={{ maxWidth: 800 }}>

        {/* Rejet ENCADRANT — style identique à DepotDocuments */}
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
              <p className="mb-0" style={{ fontSize: '0.88rem', color: '#991b1b' }}>
                Le formulaire ci-dessous est vide. Renseignez les informations de votre nouveau stage.
              </p>
            </div>
          </div>
        )}

        {/* Rejet ADMIN (correctionInfos) — style identique à DepotDocuments */}
        {correctionInfos && dossier?.motifRejet && (
          <div className="mb-4 rounded overflow-hidden" style={{ border: '2px solid #f59e0b' }}>
            <div className="px-4 py-3 d-flex align-items-center gap-2"
              style={{ background: '#f59e0b', color: '#fff' }}>
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <strong>Corrections demandées par l'administration</strong>
            </div>
            <div className="px-4 py-3" style={{ background: '#fffbeb' }}>
              <div className="mb-3">
                <div className="text-muted mb-1" style={{ fontSize: '0.82rem' }}>Motif :</div>
                <div className="p-3 rounded"
                  style={{ background: '#fff', border: '1px solid #fcd34d',
                           fontSize: '0.9rem', color: '#92400e', fontStyle: 'italic' }}>
                  <i className="bi bi-chat-left-text me-2"></i>{dossier.motifRejet}
                </div>
              </div>
              <p className="mb-0" style={{ fontSize: '0.88rem', color: '#92400e' }}>
                Le formulaire est pré-rempli avec vos données. Apportez les corrections nécessaires.
              </p>
            </div>
          </div>
        )}

        {/* Règle dates */}
        <div className="mb-4 p-3 rounded d-flex align-items-start gap-3"
          style={{ background: '#fff1f2', border: '2px solid #f87171', borderLeft: '5px solid #dc2626' }}>
          <i className="bi bi-exclamation-triangle-fill mt-1 flex-shrink-0"
            style={{ color: '#dc2626', fontSize: '1.2rem' }}></i>
          <div>
            <strong style={{ color: '#dc2626', fontSize: '0.95rem' }}>Règle importante à respecter :</strong>
            <ul className="mb-0 mt-2" style={{ fontSize: '0.88rem', color: '#7f1d1d' }}>
              <li>La période doit se situer entre le <strong>1er juin</strong> et le <strong>31 août</strong> de <strong>l'année en cours{anneeServeur ? ` (${anneeServeur})` : ''}</strong>.</li>
              <li>La durée doit être exactement <strong>29 ou 30 jours</strong>.</li>
              <li><strong>Exemples valides :</strong> 01/06 → 30/06 &nbsp;|&nbsp; 05/06 → 05/07 &nbsp;|&nbsp; 01/07 → 31/07 &nbsp;|&nbsp; 01/08 → 31/08</li>
              <li>Toute durée inférieure à 29 jours ou supérieure à 30 jours sera <strong>refusée</strong>.</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* === INFORMATIONS DU STAGE === */}
          <div className="card mb-4">
            <div className="card-header-custom">
              <i className="bi bi-briefcase"></i> Informations du stage
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label fw-500">Sujet du stage <span className="text-danger">*</span></label>
                <input name="sujetStage" className="form-control" value={form.sujetStage}
                  onChange={handleChange} required
                  placeholder="Ex: Développement d'une application web de gestion..." />
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <DateSelecteur
                    label="Date de début"
                    name="dateDebut"
                    value={form.dateDebut}
                    onChange={handleChange}
                    annee={anneeServeur}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <DateSelecteur
                    label="Date de fin"
                    name="dateFin"
                    value={form.dateFin}
                    onChange={handleChange}
                    annee={anneeServeur}
                    required
                  />
                </div>
              </div>
              {erreurDate && (
                <div className="mt-3 p-2 rounded d-flex align-items-center gap-2"
                  style={{ background: '#fef2f2', border: '1px solid #fca5a5',
                           fontSize: '0.87rem', color: '#b91c1c' }}>
                  <i className="bi bi-x-circle-fill flex-shrink-0"></i>
                  {erreurDate}
                </div>
              )}
            </div>
          </div>

          {/* === ORGANISME D'ACCUEIL === */}
          <div className="card mb-4">
            <div className="card-header-custom">
              <i className="bi bi-building"></i> Organisme d'accueil
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-500">Raison sociale <span className="text-danger">*</span></label>
                  <input name="raisonSociale" className="form-control" value={form.raisonSociale}
                    onChange={handleChange} required placeholder="Nom de l'entreprise" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-500">Secteur d'activité <span className="text-danger">*</span></label>
                  <input name="secteur" className="form-control" value={form.secteur}
                    onChange={handleChange} required placeholder="Ex: IT, Finance, Industrie..." />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-500">Type d'organisme <span className="text-danger">*</span></label>
                  <select name="typeOrganisme" className="form-select"
                    value={form.typeOrganisme} onChange={handleChange} required>
                    <option value="prive">Privé</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fw-500">Adresse complète <span className="text-danger">*</span></label>
                  <input name="adresse" className="form-control" value={form.adresse}
                    onChange={handleChange} required placeholder="Rue, Ville, Code postal" />
                </div>
              </div>
            </div>
          </div>

          {/* === RESPONSABLE DE STAGE === */}
          <div className="card mb-4">
            <div className="card-header-custom">
              <i className="bi bi-person-badge"></i> Responsable de stage
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-500">Nom du responsable <span className="text-danger">*</span></label>
                  <input name="nomCompletResponsable" className="form-control"
                    value={form.nomCompletResponsable} onChange={handleChange}
                    required placeholder="Prénom Nom du responsable" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-500">Téléphone <span className="text-danger">*</span></label>
                  <input name="telephoneResponsable" className="form-control"
                    value={form.telephoneResponsable} onChange={handleChange}
                    required placeholder="06XXXXXXXX" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-500">Email <span className="text-danger">*</span></label>
                  <input type="email" name="emailResponsable" className="form-control"
                    value={form.emailResponsable} onChange={handleChange}
                    required placeholder="responsable@entreprise.ma" />
                </div>
              </div>
            </div>
          </div>

          {/* === ACTIONS === */}
          <div className="d-flex gap-3">
            <button type="submit" className="btn btn-encg px-4" disabled={loading || !!erreurDate}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Envoi...</>
                : <><i className="bi bi-send me-2"></i>
                    {rejeteAdmin ? 'Resoumettre le dossier' : 'Soumettre la déclaration'}
                  </>
              }
            </button>
            <button type="button" className="btn btn-outline-secondary px-4"
              onClick={() => navigate('/etudiant')}>
              Annuler
            </button>
          </div>

        </form>
      </div>
    </Layout>
  );
};

export default DeclarerStage;