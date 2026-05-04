import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ETAPES = { EMAIL: 1, CODE: 2, PASSWORD: 3, SUCCES: 4 };

// Validation mot de passe sécurisé
const validerMotDePasse = (mdp) => {
  const erreurs = [];
  if (mdp.length < 8)           erreurs.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(mdp))       erreurs.push('Au moins une majuscule (A-Z)');
  if (!/[a-z]/.test(mdp))       erreurs.push('Au moins une minuscule (a-z)');
  if (!/[0-9]/.test(mdp))       erreurs.push('Au moins un chiffre (0-9)');
  if (!/[^A-Za-z0-9]/.test(mdp)) erreurs.push('Au moins un caractère spécial (!@#$%...)');
  return erreurs;
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [etape, setEtape]     = useState(ETAPES.EMAIL);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState('');

  const [email, setEmail]           = useState('');
  const [code, setCode]             = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmation, setConfirm]  = useState('');
  const [erreursMdp, setErreursMdp] = useState([]);
  const [showMdp, setShowMdp]       = useState(false);

  const reset = () => setErreur('');

  const handleMdpChange = (val) => {
    setNouveauMdp(val);
    setErreursMdp(val ? validerMotDePasse(val) : []);
  };

  // ÉTAPE 1
  const envoyerCode = async (e) => {
    e.preventDefault(); reset(); setLoading(true);
    try {
      await api.post('/forgot-password', { login: email });
      setEtape(ETAPES.CODE);
    } catch (err) {
      // 422 = email introuvable dans notre système
      const msg = err.response?.data?.message || "Erreur lors de l'envoi.";
      setErreur(msg);
      // Si email inconnu, on reste sur l'étape 1 (déjà le cas)
    } finally { setLoading(false); }
  };

  // ÉTAPE 2
  const verifierCode = async (e) => {
    e.preventDefault(); reset(); setLoading(true);
    try {
      await api.post('/verify-code', { login: email, code });
      setEtape(ETAPES.PASSWORD);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Code incorrect.');
    } finally { setLoading(false); }
  };

  // ÉTAPE 3
  const reinitialiser = async (e) => {
    e.preventDefault(); reset();
    const errs = validerMotDePasse(nouveauMdp);
    if (errs.length > 0) { setErreursMdp(errs); return; }
    if (nouveauMdp !== confirmation) { setErreur('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.post('/reset-password', { login: email, code, nouveauMotDePasse: nouveauMdp, confirmation });
      setEtape(ETAPES.SUCCES);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: '3rem' }}>🔑</div>
          <h4>Mot de passe oublié</h4>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {etape === ETAPES.EMAIL    && 'Entrez votre email pour recevoir un code'}
            {etape === ETAPES.CODE     && `Code envoyé à ${email}`}
            {etape === ETAPES.PASSWORD && 'Créez votre nouveau mot de passe'}
            {etape === ETAPES.SUCCES   && 'Mot de passe réinitialisé !'}
          </p>
        </div>

        {/* Indicateur d'étapes */}
        {etape !== ETAPES.SUCCES && (
          <div className="d-flex justify-content-center gap-2 mb-4">
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 600,
                background: etape > n ? '#16a34a' : etape === n ? '#003366' : '#e2e8f0',
                color: etape >= n ? '#fff' : '#94a3b8',
                transition: 'all 0.3s',
              }}>
                {etape > n ? '✓' : n}
              </div>
            ))}
          </div>
        )}

        {erreur && (
          <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.875rem' }}>
            <i className="bi bi-exclamation-circle me-2"></i>{erreur}
          </div>
        )}

        {/* ÉTAPE 1 : Email */}
        {etape === ETAPES.EMAIL && (
          <form onSubmit={envoyerCode}>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Email institutionnel
              </label>
              <input
                type="email" className="form-control"
                placeholder="prenom.nom@encg.ac.ma"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
              <small className="text-muted">Un code de vérification sera envoyé à cet email.</small>
            </div>
            <button type="submit" className="btn w-100 btn-encg py-2" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2" />Envoi...</>
                       : <><i className="bi bi-envelope me-2"></i>Envoyer le code</>}
            </button>
          </form>
        )}

        {/* ÉTAPE 2 : Code */}
        {etape === ETAPES.CODE && (
          <form onSubmit={verifierCode}>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Code de vérification
              </label>
              <input
                type="text" className="form-control text-center"
                placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700 }}
                required
              />
              <small className="text-muted">
                <i className="bi bi-envelope me-1"></i>
                Consultez <strong>{email}</strong> — code valable 15 minutes.
              </small>
            </div>
            <button type="submit" className="btn w-100 btn-encg py-2" disabled={loading || code.length !== 6}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2" />Vérification...</>
                       : <><i className="bi bi-shield-check me-2"></i>Vérifier le code</>}
            </button>
            <button type="button" className="btn w-100 btn-outline-secondary mt-2 py-1"
              style={{ fontSize: '0.82rem' }}
              onClick={() => { setEtape(ETAPES.EMAIL); setCode(''); reset(); }}>
              Changer d'email
            </button>
          </form>
        )}

        {/* ÉTAPE 3 : Nouveau mot de passe */}
        {etape === ETAPES.PASSWORD && (
          <form onSubmit={reinitialiser}>
            <div className="mb-2">
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Nouveau mot de passe
              </label>
              <div className="input-group">
                <input
                  type={showMdp ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Créez un mot de passe sécurisé"
                  value={nouveauMdp}
                  onChange={e => handleMdpChange(e.target.value)}
                  required
                />
                <button type="button" className="btn btn-outline-secondary"
                  onClick={() => setShowMdp(!showMdp)}>
                  <i className={`bi bi-eye${showMdp ? '-slash' : ''}`}></i>
                </button>
              </div>

              {/* Règles de sécurité */}
              <div className="mt-2 p-2 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                <div className="fw-500 mb-1" style={{ color: '#475569' }}>Le mot de passe doit contenir :</div>
                {[
                  { label: 'Au moins 8 caractères',              ok: nouveauMdp.length >= 8 },
                  { label: 'Au moins une majuscule (A-Z)',        ok: /[A-Z]/.test(nouveauMdp) },
                  { label: 'Au moins une minuscule (a-z)',        ok: /[a-z]/.test(nouveauMdp) },
                  { label: 'Au moins un chiffre (0-9)',           ok: /[0-9]/.test(nouveauMdp) },
                  { label: 'Au moins un caractère spécial (!@#$%...)', ok: /[^A-Za-z0-9]/.test(nouveauMdp) },
                ].map((r, i) => (
                  <div key={i} className="d-flex align-items-center gap-1" style={{ color: nouveauMdp ? (r.ok ? '#16a34a' : '#dc2626') : '#94a3b8' }}>
                    <i className={`bi bi-${nouveauMdp ? (r.ok ? 'check-circle-fill' : 'x-circle-fill') : 'circle'}`}></i>
                    {r.label}
                  </div>
                ))}
                <div className="mt-1" style={{ color: '#64748b' }}>
                  <strong>Exemple :</strong> MonStage@2026
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password" className="form-control"
                placeholder="Répétez le mot de passe"
                value={confirmation}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              {confirmation && nouveauMdp !== confirmation && (
                <small className="text-danger">
                  <i className="bi bi-x-circle me-1"></i>Les mots de passe ne correspondent pas.
                </small>
              )}
              {confirmation && nouveauMdp === confirmation && (
                <small className="text-success">
                  <i className="bi bi-check-circle me-1"></i>Les mots de passe correspondent.
                </small>
              )}
            </div>

            <button
              type="submit" className="btn w-100 btn-encg py-2"
              disabled={loading || erreursMdp.length > 0 || nouveauMdp !== confirmation}
            >
              {loading ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement...</>
                       : <><i className="bi bi-lock me-2"></i>Enregistrer le nouveau mot de passe</>}
            </button>
          </form>
        )}

        {/* SUCCÈS */}
        {etape === ETAPES.SUCCES && (
          <div className="text-center">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <p className="text-success fw-600 mb-3">Votre mot de passe a été réinitialisé avec succès !</p>
            <button className="btn w-100 btn-encg py-2" onClick={() => navigate('/login')}>
              <i className="bi bi-box-arrow-in-right me-2"></i>Se connecter
            </button>
          </div>
        )}

        {etape !== ETAPES.SUCCES && (
          <div className="text-center mt-3">
            <Link to="/login" style={{ fontSize: '0.82rem', color: '#64748b' }}>
              <i className="bi bi-arrow-left me-1"></i>Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;