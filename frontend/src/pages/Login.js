import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ROLE_DASHBOARD = {
  etudiant:  '/etudiant',
  encadrant: '/encadrant',
  admin:     '/admin',
  sys_admin: '/sysadmin/comptes',
  directeur: '/directeur',
};

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const loginRef    = useRef('');
  const passwordRef = useRef('');
  const timerRef    = useRef(null);

  const [loading, setLoading]         = useState(false);
  const [erreur, setErreur]           = useState('');
  const [champErreur, setChampErreur] = useState(''); // 'email' ou 'password'

  const effacerErreur = useCallback(() => {
    setErreur('');
    setChampErreur('');
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    effacerErreur();
    setLoading(true);
    try {
      const user = await login(loginRef.current, passwordRef.current);
      toast.success(`Bienvenue, ${user.profil?.nomComplet || user.login} !`);
      navigate(ROLE_DASHBOARD[user.role] || '/login');
    } catch (err) {
      const msg   = err.response?.data?.message || 'Identifiants incorrects. Veuillez réessayer.';
      const champ = err.response?.data?.champ   || '';
      setErreur(msg);
      setChampErreur(champ);
      timerRef.current = setTimeout(effacerErreur, 15000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="ENCGO" style={{ width: '130px', marginBottom: '12px' }} />
          <h4>ENCGO</h4>
          <p>Espace Stages ENCGO</p>
        </div>

        <form onSubmit={handleSubmit}>
          {erreur && (
            <div
              className="alert alert-danger py-2 mb-3 d-flex align-items-center gap-2"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
              <span className="flex-grow-1">{erreur}</span>
              <button type="button" className="btn-close btn-close-sm ms-2" onClick={effacerErreur} />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Email institutionnel
            </label>
            <div className="input-group">
              <span className={`input-group-text bg-light border-end-0 ${champErreur === 'email' ? 'border-danger' : ''}`}>
                <i className={`bi bi-envelope ${champErreur === 'email' ? 'text-danger' : 'text-muted'}`}></i>
              </span>
              <input
                type="email"
                className={`form-control border-start-0 ${champErreur === 'email' ? 'border-danger' : ''}`}
                placeholder="prenom.nom@encg.ac.ma"
                defaultValue=""
                onChange={e => { loginRef.current = e.target.value; if (erreur) effacerErreur(); }}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Mot de passe
            </label>
            <div className="input-group">
              <span className={`input-group-text bg-light border-end-0 ${champErreur === 'password' ? 'border-danger' : ''}`}>
                <i className={`bi bi-lock ${champErreur === 'password' ? 'text-danger' : 'text-muted'}`}></i>
              </span>
              <input
                type="password"
                className={`form-control border-start-0 ${champErreur === 'password' ? 'border-danger' : ''}`}
                placeholder="••••••••"
                defaultValue=""
                onChange={e => { passwordRef.current = e.target.value; if (erreur) effacerErreur(); }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn w-100 btn-encg py-2" disabled={loading}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" />Connexion en cours...</>
            ) : (
              <><i className="bi bi-box-arrow-in-right me-2"></i>Se connecter</>
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;