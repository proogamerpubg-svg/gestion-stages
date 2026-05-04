import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ roles = [] }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.includes(role)) {
    return <Outlet />;
  }

  const routesAdminSysAdmin = ['admin', 'sys_admin'];
  const routeEstAdmin = roles.some(r => routesAdminSysAdmin.includes(r));
  if (role === 'sys_admin' && routeEstAdmin) {
    return <Outlet />;
  }

  const dashboards = {
    etudiant:  '/etudiant',
    encadrant: '/encadrant',
    admin:     '/admin',
    sys_admin: '/sysadmin/comptes',
    directeur: '/directeur',
  };

  return <Navigate to={dashboards[role] || '/login'} replace />;
};

export default ProtectedRoute;