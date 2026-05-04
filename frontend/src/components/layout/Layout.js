import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fermer sidebar automatiquement si on passe en desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fermerSidebar = () => setSidebarOpen(false);

  return (
    <div>
      {/* Overlay — SEULEMENT sur mobile quand sidebar ouverte */}
      {sidebarOpen && window.innerWidth <= 991 && (
        <div
          onClick={fermerSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar-wrapper${sidebarOpen ? ' sidebar-open' : ''}`}>
        <Sidebar onLinkClick={fermerSidebar} />
      </aside>

      {/* Contenu principal */}
      <div className="main-content">
        <Topbar
          title={title}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;