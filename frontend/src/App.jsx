import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { CRM } from './pages/CRM';
import { Batches } from './pages/Batches';
import { Finance } from './pages/Finance';
import { Attendance } from './pages/Attendance';
import { Tournaments } from './pages/Tournaments';
import { PerformanceDash } from './pages/PerformanceDash';
import { StudentAnalytics } from './pages/StudentAnalytics';
import { ConceptualMastery } from './pages/ConceptualMastery';
import { LevelProgression } from './pages/LevelProgression';
import { Coaches } from './pages/Coaches';
import Users from './pages/Users';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="crm" element={<CRM />} />
            <Route path="students" element={<Students />} />
            <Route path="batches" element={<Batches />} />
            <Route path="finance" element={<Finance />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="tournaments" element={<Tournaments />} />
            <Route path="performance" element={<PerformanceDash />} />
            <Route path="analytics" element={<StudentAnalytics />} />
            <Route path="mastery" element={<ConceptualMastery />} />
            <Route path="progression" element={<LevelProgression />} />
            <Route path="coaches" element={<Users />} />
            {/* Mock settings page for now */}
            <Route path="fees" element={<Finance />} />
            <Route path="settings" element={<div className="animate-fade-in glass-panel"><h2>Settings</h2><p>Configuration options coming soon.</p></div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
