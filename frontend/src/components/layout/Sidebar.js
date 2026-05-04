import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const menus = {
  etudiant: [
    { to: '/etudiant',           icon: 'bi-house',                    label: 'Tableau de bord' },
    { to: '/etudiant/declarer',  icon: 'bi-pencil-square',            label: 'Déclarer mon stage' },
    { to: '/etudiant/modeles',   icon: 'bi-file-earmark-arrow-down',  label: 'Modèles documents' },
    { to: '/etudiant/documents', icon: 'bi-upload',                   label: 'Déposer documents' },
    { to: '/etudiant/journal',   icon: 'bi-journal-text',             label: 'Journal de bord' },
  ],
  encadrant: [
    { to: '/encadrant',        icon: 'bi-house',        label: 'Tableau de bord' },
    { to: '/encadrant/profil', icon: 'bi-person-badge', label: 'Mon profil' },
  ],
  admin: [
    { to: '/admin',          icon: 'bi-house',                    label: 'Tableau de bord' },
    { to: '/admin/import',   icon: 'bi-file-excel',               label: 'Import Excel' },
    { to: '/admin/modeles',  icon: 'bi-file-earmark-arrow-down',  label: 'Modèles documents' },
    { to: '/admin/archives', icon: 'bi-archive',                  label: 'Archives' },
  ],
  sys_admin: [
    { to: '/sysadmin/import',  icon: 'bi-file-excel', label: 'Import Excel' },
    { to: '/sysadmin/comptes', icon: 'bi-people',     label: 'Gestion comptes' },
  ],
  directeur: [
    { to: '/directeur', icon: 'bi-house', label: 'Tableau de bord' },
  ],
};

const roleLabels = {
  etudiant:  'Étudiant',
  encadrant: 'Encadrant',
  admin:     'Administration',
  sys_admin: 'Administrateur Système',
  directeur: 'Directeur',
};

const Sidebar = ({ onLinkClick }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.info('Déconnexion réussie.');
    navigate('/login');
  };

  const links = menus[role] || [];
  const nomAffiche = user?.profil?.nomComplet || user?.login || 'Utilisateur';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🎓</div>
        <h5>ENCG</h5>
        <small>Espace Stages ENCGO</small>
      </div>

      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: '0.8rem',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>
          {roleLabels[role] || role}
        </div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
          {nomAffiche.length > 22 ? nomAffiche.substring(0, 22) + '…' : nomAffiche}
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to.split('/').length <= 2}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={onLinkClick}
          >
            <i className={`bi ${link.icon}`}></i>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={() => { handleLogout(); onLinkClick?.(); }}
          className="sidebar-link w-100 border-0 text-start"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          <i className="bi bi-box-arrow-left"></i>
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;