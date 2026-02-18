import React from 'react'; // Force HMR update
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
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
import logo from './assets/Clustox Logo Black_Artboard 1.png';
import { AuthProvider, useAuth } from './context/AuthContext';
import MyInterviews from './pages/MyInterviews';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

// Layout component for authenticated users
const Layout = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (['owner', 'hr'].includes(user?.role)) {
      return '/dashboard';
    }
    return '/jobs';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Simple Navbar for Navigation */}
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-8">
          <span className="text-xl font-bold text-gray-800 flex items-center">
            <img src={logo} alt="Clustox Logo" className="h-8 w-auto mr-2" />
            Clustox ATS
          </span>
          <div className="space-x-6">
            <Link to="/dashboard" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Dashboard</Link>
            {user?.role !== 'interviewer' && (
              <Link to="/departments" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Departments</Link>
            )}
            <Link to="/jobs" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Jobs</Link>
            {user?.role !== 'interviewer' && (
              <Link to="/candidates" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Candidates</Link>
            )}
            <Link to="/my-interviews" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">My Interviews</Link>
            {['hr', 'owner'].includes(user?.role) && (
              <Link to="/team" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Team</Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-right">
            <p className="font-medium text-gray-900">{user.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </div>
    </div>
  );
};

// Default route component
const DefaultRoute = () => {
  const { user, loading } = useAuth();
  
  // Show loading spinner while user data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }
  
  const getDefaultRoute = () => {
    // All users go to dashboard (content will be role-based)
    return '/dashboard';
  };
  
  return <Navigate to={getDefaultRoute()} replace />;
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
              <Route path="/departments" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <DepartmentsPage />
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
                  <Candidates />
                </ProtectedRoute>
              } />
              <Route path="/candidates/:id" element={
                <ProtectedRoute allowedRoles={['owner', 'hr', 'hiring_manager']}>
                  <CandidateDetail />
                </ProtectedRoute>
              } />
              <Route path="/my-interviews" element={<MyInterviews />} />
              <Route path="/team" element={
                <ProtectedRoute allowedRoles={['owner', 'hr']}>
                  <Team />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
