import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';

const Topbar = ({ title, onMenuToggle, sidebarOpen }) => {
  const navigate = useNavigate();
  const [nonLues, setNonLues] = useState(0);

  const chargerBadge = async () => {
    try {
      const res   = await notificationService.index();
      const items = res.data.data || [];
      setNonLues(items.filter(n => !n.lu).length);
    } catch (_) {}
  };

  useEffect(() => {
    chargerBadge();
    const interval = setInterval(chargerBadge, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="topbar">
      <div className="d-flex align-items-center gap-3">
        {/* Burger — visible seulement sur mobile */}
        <button
          className="burger-btn"
          onClick={onMenuToggle}
          aria-label="Menu"
        >
          <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'}`}
             style={{ fontSize: '1.4rem' }}>
          </i>
        </button>

        <h6 className="mb-0" style={{ color: '#003366', fontWeight: 600 }}>
          {title}
        </h6>
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="position-relative">
          <button
            className="btn btn-light btn-sm position-relative"
            onClick={() => navigate('/notifications')}
            style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <i className="bi bi-bell fs-5"></i>
            {nonLues > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: '0.65rem' }}
              >
                {nonLues > 99 ? '99+' : nonLues}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Topbar;