import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import documentService from '../../services/documentService';
import stageService from '../../services/stageService';
import { toast } from 'react-toastify';

const STATUTS_AUTORISES = [
  'en_attente_admin',
  'en_cours',
  'journal_mi',
  'journal_fin',
  'cloture_deposee',
  'valide_encadrant',
  'cloture',
  'archive',
];

const ModelesDocuments = () => {
  const [modeles, setModeles]   = useState([]);
  const [dossier, setDossier]   = useState(null);
  const [loadInit, setLoadInit] = useState(true);
  const [loading, setLoading]   = useState({});

  useEffect(() => {
    Promise.all([
      stageService.monDossier(),
      documentService.listeModeles(),
    ]).then(([resDossier, resModeles]) => {
      setDossier(resDossier.data.dossier);
      setModeles(resModeles.data.modeles || []);
    }).catch(() => {
      setDossier(null);
    }).finally(() => setLoadInit(false));
  }, []);

  const telecharger = async (fichier, nom) => {
    setLoading(prev => ({ ...prev, [fichier]: true }));
    try {
      const res = await documentService.telechargerModele(fichier);
      if (res.status === 202) {
        toast.info("Modèle non encore disponible. Contactez l'administration.");
        return;
      }
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', fichier);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`"${nom}" téléchargé avec succès.`);
    } catch {
      toast.error('Erreur lors du téléchargement.');
    } finally {
      setLoading(prev => ({ ...prev, [fichier]: false }));
    }
  };

  if (loadInit) return (
    <Layout title="Modèles de documents">
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#003366' }} />
      </div>
    </Layout>
  );

  const status          = dossier?.statusStage;
  const rejeteEncadrant = status === 'rejete' && !dossier?.idStage;
  const rejeteAdmin     = status === 'rejete' && !!dossier?.idStage;
  const accesAutorise   = STATUTS_AUTORISES.includes(status) || rejeteAdmin;

  // ─── Pas encore déclaré ───
  if (!status) {
    return (
      <Layout title="Modèles de documents">
        <div style={{ maxWidth: 700 }}>
          <div className="alert alert-warning d-flex gap-3 align-items-start">
            <i className="bi bi-lock-fill fs-4 mt-1 flex-shrink-0" style={{ color: '#92400e' }}></i>
            <div>
              <strong>Téléchargement non disponible</strong>
              <p className="mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
                Vous devez d'abord <strong>déclarer votre stage</strong> avant de pouvoir télécharger les modèles.
              </p>
              <a href="/etudiant/declarer" className="btn btn-sm btn-warning mt-3">
                <i className="bi bi-pencil-square me-1"></i>Déclarer mon stage
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── En attente réponse encadrant ───
  if (status === 'declare') {
    return (
      <Layout title="Modèles de documents">
        <div style={{ maxWidth: 700 }}>
          <div className="p-4 rounded d-flex align-items-start gap-3"
            style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderLeft: '5px solid #f59e0b' }}>
            <i className="bi bi-hourglass-split flex-shrink-0 mt-1"
              style={{ color: '#d97706', fontSize: '1.4rem' }}></i>
            <div>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>
                En attente de confirmation de votre encadrant
              </strong>
              <p className="mb-2 mt-1" style={{ fontSize: '0.88rem', color: '#78350f' }}>
                Vous pourrez télécharger les modèles dès que votre encadrant{' '}
                <strong>confirme votre encadrement</strong>.
              </p>
              <div className="mt-2" style={{ fontSize: '0.82rem', color: '#92400e' }}>
                Si pas de réponse dans <strong>24h</strong>, la confirmation sera automatique.
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Rejet encadrant — style uniforme ───
  if (rejeteEncadrant) {
    return (
      <Layout title="Modèles de documents">
        <div style={{ maxWidth: 700 }}>
          <div className="rounded overflow-hidden" style={{ border: '2px solid #dc2626' }}>
            <div
              className="d-flex align-items-center gap-2 px-4 py-3"
              style={{ background: '#dc2626', color: '#fff' }}
            >
              <i className="bi bi-x-circle-fill fs-5"></i>
              <strong style={{ fontSize: '1rem' }}>Accès bloqué — Demande rejetée par votre encadrant</strong>
            </div>
            <div className="px-4 py-3" style={{ background: '#fef2f2' }}>
              {dossier?.motifRejet && (
                <div className="mb-2" style={{ fontSize: '0.92rem' }}>
                  <strong>Motif :</strong>{' '}
                  <em style={{ color: '#991b1b' }}>{dossier.motifRejet}</em>
                </div>
              )}
              <div className="mb-3" style={{ fontSize: '0.88rem', color: '#7f1d1d' }}>
                Vous devez soumettre une <strong>nouvelle demande de stage</strong> pour accéder aux modèles.
              </div>
              <a href="/etudiant/declarer" className="btn btn-sm btn-danger">
                <i className="bi bi-pencil-square me-1"></i>Nouvelle demande
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Autorisé ───
  return (
    <Layout title="Modèles de documents">
      <div style={{ maxWidth: 700 }}>

        <div className="info-box mb-4">
          <i className="bi bi-arrow-down-circle me-2"></i>
          <strong>Étape 1 :</strong> Téléchargez les 3 modèles ci-dessous.<br />
          <strong>Étape 2 :</strong> Imprimez-les, faites-les signer, puis numérisez-les en PDF.<br />
          <strong>Étape 3 :</strong> Retournez dans <strong>"Déposer documents"</strong> pour uploader les PDF signés.
        </div>

        {modeles.map((m, i) => (
          <div key={i} className="card mb-3">
            <div className="card-body d-flex gap-3 align-items-center">
              <i className="bi bi-file-earmark-pdf fs-2 text-danger"></i>
              <div className="flex-grow-1">
                <div className="fw-600" style={{ fontWeight: 600 }}>{m.nom}</div>
              </div>
              <button
                className="btn btn-encg btn-sm"
                onClick={() => telecharger(m.fichier, m.nom)}
                disabled={loading[m.fichier]}
              >
                {loading[m.fichier]
                  ? <span className="spinner-border spinner-border-sm" />
                  : <><i className="bi bi-download me-1"></i>Télécharger</>
                }
              </button>
            </div>
          </div>
        ))}

        <div
          className="mt-3 p-3 rounded d-flex align-items-start gap-2"
          style={{ background: '#fff1f2', border: '2px solid #dc2626', borderLeft: '5px solid #dc2626', fontSize: '0.85rem' }}
        >
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-1" style={{ color: '#dc2626' }}></i>
          <div style={{ color: '#7f1d1d' }}>
            <strong>Important :</strong> La convention de stage doit obligatoirement être signée
            par l'organisme d'accueil <em>avant</em> le début du stage.
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ModelesDocuments;