import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages publiques
import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Notifications
import Notifications from './pages/Notifications';

// Pages étudiant
import EtudiantDashboard from './pages/etudiant/Dashboard';
import DeclarerStage     from './pages/etudiant/DeclarerStage';
import DepotDocuments    from './pages/etudiant/DepotDocuments';
import JournalBord       from './pages/etudiant/JournalBord';
import ModelesDocuments  from './pages/etudiant/ModelesDocuments';

// Pages encadrant
import EncadrantDashboard from './pages/encadrant/Dashboard';
import EncadrantProfil    from './pages/encadrant/Profil';
import EncadrantDossier   from './pages/encadrant/Dossier';

// Pages admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminDossier   from './pages/admin/Dossier';
import AdminImport    from './pages/admin/Import';
import AdminArchives  from './pages/admin/Archives';
import GestionModeles from './pages/admin/GestionModeles';

// Pages sys_admin
import SysAdminComptes from './pages/sysadmin/Comptes';

// Pages directeur
import DirecteurDashboard from './pages/directeur/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Routes>

          {/* ── Routes publiques ── */}
          <Route path="/login"           element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/"                element={<Navigate to="/login" replace />} />

          {/* ── Notifications ── */}
          <Route element={<ProtectedRoute roles={['etudiant', 'encadrant', 'admin', 'directeur']} />}>
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* ── Routes étudiant ── */}
          <Route element={<ProtectedRoute roles={['etudiant']} />}>
            <Route path="/etudiant"           element={<EtudiantDashboard />} />
            <Route path="/etudiant/declarer"  element={<DeclarerStage />} />
            <Route path="/etudiant/modeles"   element={<ModelesDocuments />} />
            <Route path="/etudiant/documents" element={<DepotDocuments />} />
            <Route path="/etudiant/journal"   element={<JournalBord />} />
          </Route>

          {/* ── Routes encadrant ── */}
          <Route element={<ProtectedRoute roles={['encadrant']} />}>
            <Route path="/encadrant"             element={<EncadrantDashboard />} />
            <Route path="/encadrant/dossier/:id" element={<EncadrantDossier />} />
            <Route path="/encadrant/profil"      element={<EncadrantProfil />} />
          </Route>

          {/* ── Routes admin ── */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin"             element={<AdminDashboard />} />
            <Route path="/admin/dossier/:id" element={<AdminDossier />} />
            <Route path="/admin/import"      element={<AdminImport />} />
            <Route path="/admin/archives"    element={<AdminArchives />} />
            <Route path="/admin/modeles"     element={<GestionModeles />} />
          </Route>

          {/* ── Routes sys_admin ── */}
          <Route element={<ProtectedRoute roles={['sys_admin']} />}>
            <Route path="/sysadmin/comptes" element={<SysAdminComptes />} />
            <Route path="/sysadmin/import"  element={<AdminImport />} />
          </Route>

          {/* ── Routes directeur ── */}
          <Route element={<ProtectedRoute roles={['directeur']} />}>
            <Route path="/directeur"             element={<DirecteurDashboard />} />
            <Route path="/directeur/dossier/:id" element={<AdminDossier readOnly={true} />} />
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;