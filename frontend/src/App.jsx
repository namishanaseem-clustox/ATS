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
import logo from './assets/Clustox Logo Black_Artboard 1.png';
import { AuthProvider, useAuth } from './context/AuthContext';
import MyInterviews from './pages/MyInterviews';

const queryClient = new QueryClient();

// Layout component for authenticated users
const Layout = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
            <Link to="/departments" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Departments</Link>
            <Link to="/jobs" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Jobs</Link>
            <Link to="/candidates" className="text-gray-600 hover:text-[#00C853] font-medium transition-colors">Candidates</Link>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/jobs" replace />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/departments/:id" element={<DepartmentDetail />} />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/jobs/new" element={<JobWizard />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/jobs/:id/edit" element={<JobWizard />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/candidates/:id" element={<CandidateDetail />} />
              <Route path="/my-interviews" element={<MyInterviews />} />
              <Route path="/team" element={<Team />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
