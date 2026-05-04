import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import api from '../../services/api';
import { toast } from 'react-toastify';

/**
 * Comptes.js — Gestion des comptes (Sys_Admin uniquement).
 *
 * RÈGLES (Doc v3 Partie 3, point 16-17) :
 *   ✅ Le sys_admin peut créer uniquement : admin, sys_admin, directeur
 *   ❌ Les comptes étudiant et encadrant sont créés automatiquement via Import Excel
 *   ✅ Champ nomComplet obligatoire pour tous les rôles affichés ici
 *
 * CORRECTIONS :
 *   - Retrait de 'etudiant' et 'encadrant' des options de création
 *   - Champ nomComplet toujours visible et obligatoire
 *   - Design amélioré avec labels clairs
 */

// Seuls ces rôles peuvent être créés manuellement
const ROLES_MANUELS = ['admin', 'sys_admin', 'directeur'];

const FORM_INITIAL = { login: '', motDePasse: '', role: 'admin', nomComplet: '' };

const SysAdminComptes = () => {
  const [comptes, setComptes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState(FORM_INITIAL);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const charger = () => {
    setLoading(true);
    api.get('/sysadmin/comptes')
      .then(res => {
        // Afficher uniquement les comptes admin/sys_admin/directeur dans cette page
        const tousComptes = res.data.data || [];
        const comptesAdmin = tousComptes.filter(c =>
          ROLES_MANUELS.includes(c.role)
        );
        setComptes(comptesAdmin);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const creer = async (e) => {
    e.preventDefault();
    if (!form.nomComplet.trim()) {
      toast.error('Le nom complet est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/sysadmin/comptes', form);
      toast.success(`Compte ${form.role} créé avec succès.`);
      setForm(FORM_INITIAL);
      setShowForm(false);
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const changerRole = async (id, role) => {
    if (!ROLES_MANUELS.includes(role)) {
      toast.error('Changement de rôle non autorisé vers ce rôle.');
      return;
    }
    try {
      await api.post(`/sysadmin/comptes/${id}/changer-role`, { role });
      toast.success('Rôle modifié.');
      charger();
    } catch {
      toast.error('Erreur lors du changement de rôle.');
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer ce compte définitivement ?')) return;
    try {
      await api.delete(`/sysadmin/comptes/${id}`);
      toast.success('Compte supprimé.');
      charger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const roleBadge = (role) => {
    const config = {
      admin:     { color: '#f59e0b', bg: '#fef3c7', label: 'Admin' },
      sys_admin: { color: '#ef4444', bg: '#fee2e2', label: 'Sys Admin' },
      directeur: { color: '#06b6d4', bg: '#cffafe', label: 'Directeur' },
    };
    const c = config[role] || { color: '#64748b', bg: '#f1f5f9', label: role };
    return (
      <span style={{
        background: c.bg,
        color: c.color,
        fontWeight: 600,
        fontSize: '0.78rem',
        padding: '3px 10px',
        borderRadius: 20,
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <Layout title="Gestion des comptes">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="text-muted" style={{ fontSize: '0.88rem' }}>
          {comptes.length} compte(s) administratif(s)
        </div>
        <button className="btn btn-encg btn-sm" onClick={() => setShowForm(!showForm)}>
          <i className="bi bi-person-plus me-1"></i>Nouveau compte
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header-custom">
            <i className="bi bi-person-plus"></i> Créer un compte administratif
          </div>
          <div className="card-body">
            <form onSubmit={creer}>
              <div className="row g-3">

                {/* Nom complet — TOUJOURS obligatoire */}
                <div className="col-md-4">
                  <label className="form-label">
                    Nom complet <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nomComplet}
                    onChange={e => setForm({ ...form, nomComplet: e.target.value })}
                    required
                    placeholder="Prénom Nom"
                  />
                  <small className="text-muted">Affiché dans la bannière de bienvenue</small>
                </div>

                {/* Email */}
                <div className="col-md-3">
                  <label className="form-label">
                    Email (login) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.login}
                    onChange={e => setForm({ ...form, login: e.target.value })}
                    required
                    placeholder="prenom.nom@encg.ac.ma"
                  />
                </div>

                {/* Mot de passe */}
                <div className="col-md-2">
                  <label className="form-label">
                    Mot de passe <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.motDePasse}
                    onChange={e => setForm({ ...form, motDePasse: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Min. 6 car."
                  />
                </div>

                {/* Rôle — seulement admin/sys_admin/directeur */}
                <div className="col-md-2">
                  <label className="form-label">
                    Rôle <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="sys_admin">Sys Admin</option>
                    <option value="directeur">Directeur</option>
                  </select>
                </div>

                {/* Boutons */}
                <div className="col-md-1 d-flex align-items-end">
                  <button type="submit" className="btn btn-encg w-100" disabled={submitting}>
                    {submitting
                      ? <span className="spinner-border spinner-border-sm" />
                      : <><i className="bi bi-check me-1"></i>Créer</>
                    }
                  </button>
                </div>

                <div className="col-12">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => { setShowForm(false); setForm(FORM_INITIAL); }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#003366' }} />
            </div>
          ) : comptes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people fs-1 d-block mb-2"></i>
              Aucun compte administratif trouvé.
            </div>
          ) : (
            <table className="table table-encg table-hover mb-0">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th>Login (email)</th>
                  <th>Rôle</th>
                  <th>Changer rôle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comptes.map(c => (
                  <tr key={c.idCompte}>
                    <td>
                      <strong style={{ fontSize: '0.88rem' }}>
                        {c.nomComplet || <span className="text-muted fst-italic">Non renseigné</span>}
                      </strong>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{c.login}</td>
                    <td>{roleBadge(c.role)}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: 150 }}
                        value={c.role}
                        onChange={e => changerRole(c.idCompte, e.target.value)}
                      >
                        {ROLES_MANUELS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => supprimer(c.idCompte)}
                        title="Supprimer"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SysAdminComptes;
