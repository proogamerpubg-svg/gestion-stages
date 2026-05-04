import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import stageService from '../../services/stageService';
import { toast } from 'react-toastify';

const JournalBord = () => {
  const navigate = useNavigate();
  const [dossier, setDossier]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loadInit, setLoadInit] = useState(true);
  const [bilan1, setBilan1]     = useState('');
  const [bilan2, setBilan2]     = useState('');

  const charger = () => {
    stageService.monDossier()
      .then(res => {
        const d = res.data.dossier;
        setDossier(d);
        setBilan1(d?.mission1 || '');
        setBilan2(d?.mission2 || '');
      })
      .finally(() => setLoadInit(false));
  };

  useEffect(() => { charger(); }, []);

  const soumettreMiStage = async () => {
    if (bilan1.length < 50) return toast.warning('Votre bilan doit contenir au moins 50 caractères.');
    setLoading(true);
    try {
      await stageService.saisirJournalMi({ mission1: bilan1 });
      toast.success('Journal de mi-stage soumis. Votre encadrant a été notifié.');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  const soumettreFinStage = async () => {
    if (bilan2.length < 50) return toast.warning('Votre bilan doit contenir au moins 50 caractères.');
    setLoading(true);
    try {
      await stageService.saisirJournalFin({ mission2: bilan2 });
      toast.success('Journal de fin de stage soumis. Déposez maintenant vos documents de clôture.');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  if (loadInit) return (
    <Layout title="Journal de bord">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  const status   = dossier?.statusStage;
  const peutMi   = status === 'en_cours';
  const peutFin  = status === 'journal_mi';
  const miSaisi  = !!dossier?.mission1;
  const finSaisi = !!dossier?.mission2;

  const journalBloque =
    !status ||
    status === 'declare' ||
    status === 'en_attente_admin' ||
    status === 'rejete';

  // Message d'explication selon la situation
  const getMessageBlocage = () => {
    if (status === 'declare')
      return 'Votre déclaration est en attente de réponse de votre encadrant. Le journal sera accessible après la confirmation de votre encadrant et la validation de votre dossier par l\'administration.';
    if (status === 'en_attente_admin')
      return 'Votre encadrant a confirmé votre stage. Le journal sera accessible dès que l\'administration valide votre dossier.';
    if (status === 'rejete')
      return 'Votre dossier a été rejeté. Vous devez corriger et resoumettre votre déclaration avant d\'accéder au journal.';
    return 'Le journal de bord n\'est pas encore accessible. Il sera disponible une fois votre stage officiellement en cours.';
  };

  return (
    <Layout title="Journal de bord">
      <div style={{ maxWidth: 750 }}>

        {/* ── Message explicatif en haut ── */}
        <div
          className="mb-4 p-3 rounded d-flex align-items-start gap-3"
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderLeft: '5px solid #f59e0b',
          }}
        >
          <i className="bi bi-journal-text flex-shrink-0 mt-1" style={{ color: '#d97706', fontSize: '1.3rem' }}></i>
          <div style={{ fontSize: '0.88rem', color: '#78350f' }}>
            <strong style={{ fontSize: '0.93rem' }}>Comment fonctionne le journal de bord ?</strong>
            <ul className="mb-0 mt-2">
              <li><strong>Étape 1 — Mi-stage :</strong> Vous saisissez un bilan à mi-parcours de votre stage. Votre encadrant le consulte et laisse un commentaire.</li>
              <li><strong>Étape 2 — Fin de stage :</strong> Après le commentaire de l'encadrant, vous saisissez le bilan final de votre stage.</li>
              <li>Les deux étapes sont <strong>obligatoires</strong> avant de pouvoir déposer vos documents de clôture.</li>
            </ul>
          </div>
        </div>

        {/* ── Message de blocage si journal pas accessible ── */}
        {journalBloque && (
          <div
            className="mb-4 p-3 rounded d-flex align-items-start gap-3"
            style={{
              background: '#eff6ff',
              border: '1px solid #93c5fd',
              borderLeft: '5px solid #3b82f6',
            }}
          >
            <i className="bi bi-lock-fill flex-shrink-0 mt-1" style={{ color: '#1d4ed8', fontSize: '1.2rem' }}></i>
            <div style={{ fontSize: '0.88rem', color: '#1e3a8a' }}>
              <strong>Journal non accessible pour l'instant</strong>
              <p className="mb-0 mt-1">{getMessageBlocage()}</p>
            </div>
          </div>
        )}

        {/* ── JOURNAL MI-STAGE ── */}
        <div className="card mb-4">
          <div className="card-header-custom">
            <i className="bi bi-journal"></i> Journal de mi-stage
            {miSaisi && <span className="ms-2 badge bg-success">Soumis ✓</span>}
          </div>
          <div className="card-body">
            <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
              Décrivez vos réalisations, difficultés rencontrées et apprentissages à mi-parcours du stage.
            </p>
            <div className="mb-3">
              <label className="form-label fw-500">
                Votre bilan de mi-stage <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows={6}
                value={bilan1}
                onChange={e => setBilan1(e.target.value)}
                placeholder="Décrivez vos réalisations, difficultés rencontrées et apprentissages à mi-parcours..."
                disabled={!peutMi || miSaisi}
              />
              <small className="text-muted">{bilan1.length} caractères (minimum 50)</small>
            </div>

            {dossier?.reponseMission1 && (
              <div className="p-3 rounded mt-2 mb-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <strong><i className="bi bi-chat-quote me-1"></i>Commentaire de l'encadrant :</strong>
                <p className="mb-0 mt-1" style={{ fontSize: '0.88rem' }}>{dossier.reponseMission1}</p>
              </div>
            )}

            {peutMi && !miSaisi && (
              <button
                className="btn btn-encg mt-2"
                onClick={soumettreMiStage}
                disabled={loading || bilan1.length < 50}
              >
                {loading
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : <i className="bi bi-send me-2"></i>}
                Soumettre le journal de mi-stage
              </button>
            )}
          </div>
        </div>

        {/* ── JOURNAL FIN DE STAGE ── */}
        <div className="card mb-4">
          <div className="card-header-custom">
            <i className="bi bi-journal-check"></i> Journal de fin de stage
            {finSaisi && <span className="ms-2 badge bg-success">Soumis ✓</span>}
          </div>
          <div className="card-body">
            <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
              Bilan global du stage : compétences acquises, objectifs atteints, apports professionnels.
            </p>
            <div className="mb-3">
              <label className="form-label fw-500">
                Votre bilan de fin de stage <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows={6}
                value={bilan2}
                onChange={e => setBilan2(e.target.value)}
                placeholder="Bilan global du stage : compétences acquises, objectifs atteints, apports professionnels..."
                disabled={!peutFin || finSaisi}
              />
              <small className="text-muted">{bilan2.length} caractères (minimum 50)</small>
            </div>

            {dossier?.reponseMission2 && (
              <div className="p-3 rounded mt-2 mb-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <strong><i className="bi bi-chat-quote me-1"></i>Commentaire de l'encadrant :</strong>
                <p className="mb-0 mt-1" style={{ fontSize: '0.88rem' }}>{dossier.reponseMission2}</p>
              </div>
            )}

            {peutFin && !finSaisi && (
              <button
                className="btn btn-encg mt-2"
                onClick={soumettreFinStage}
                disabled={loading || bilan2.length < 50}
              >
                {loading
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : <i className="bi bi-send me-2"></i>}
                Soumettre le journal de fin de stage
              </button>
            )}

            {!peutFin && !finSaisi && !journalBloque && (
              <div className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-lock me-1"></i>
                Accessible après la saisie du journal de mi-stage <strong>et</strong> le commentaire de votre encadrant.
              </div>
            )}
          </div>
        </div>

        <button className="btn btn-outline-secondary" onClick={() => navigate('/etudiant')}>
          <i className="bi bi-arrow-left me-2"></i>Retour
        </button>
      </div>
    </Layout>
  );
};

export default JournalBord;