import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DepartmentsPage from './pages/Departments/DepartmentsPage';
import DepartmentDetail from './pages/Departments/DepartmentDetail';
import JobBoard from './pages/JobBoard';
import JobWizard from './pages/JobWizard';
import JobDetail from './pages/JobDetail';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import Team from './pages/Team';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import Tasks from './pages/Tasks';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Notifications from './components/Notifications';
import ScorecardTemplatesPage from './pages/ScorecardTemplatesPage';
import AdminPage from './pages/Admin/AdminPage';
import PipelineSettingsPage from './pages/Admin/PipelineSettingsPage';
import PermissionsPage from './pages/Admin/PermissionsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ProfileSettings from './pages/Settings/ProfileSettings';
import NotificationsSettings from './pages/Settings/NotificationsSettings';
import AppearanceSettings from './pages/Settings/AppearanceSettings';

const queryClient = new QueryClient();

// Layout component for authenticated users — sidebar-based
const Layout = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 flex-shrink-0 z-10">
          <Notifications />
          {/* User profile could go here too if we wanted duplicates, but it's in sidebar footer */}
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Default route component
const DefaultRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<DefaultRoute />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/departments" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <DepartmentsPage readOnly={true} />
                </ProtectedRoute>
              } />
              <Route path="/departments/:id" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <DepartmentDetail />
                </ProtectedRoute>
              } />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/jobs/new" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <JobWizard />
                </ProtectedRoute>
              } />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/jobs/:id/edit" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <JobWizard />
                </ProtectedRoute>
              } />
              <Route path="/candidates" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <Candidates readOnly={true} />
                </ProtectedRoute>
              } />
              <Route path="/candidates/:id" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager', 'interviewer']}>
                  <CandidateDetail />
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <AdminPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/team" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <Team />
                </ProtectedRoute>
              } />
              <Route path="/admin/scorecards" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <ScorecardTemplatesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/departments" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <DepartmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/candidates" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <Candidates />
                </ProtectedRoute>
              } />
              <Route path="/admin/pipeline" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <PipelineSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/permissions" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <PermissionsPage />
                </ProtectedRoute>
              } />

              {/* Settings routes — accessible to all logged-in users */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/notifications" element={<NotificationsSettings />} />
              <Route path="/settings/appearance" element={<AppearanceSettings />} />

              {/* Redirects for legacy routes */}
              <Route path="/team" element={<Navigate to="/admin/team" replace />} />
              <Route path="/scorecards" element={<Navigate to="/admin/scorecards" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
