import React from 'react'; // Force HMR update
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import DepartmentsPage from './pages/Departments/DepartmentsPage';
import DepartmentDetail from './pages/Departments/DepartmentDetail';
import JobBoard from './pages/JobBoard';
import JobWizard from './pages/JobWizard';
import JobDetail from './pages/JobDetail';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import logo from './assets/Clustox Logo Black_Artboard 1.png';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
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
              </div>
            </div>
          </nav>

          <div className="flex-1 overflow-auto bg-gray-50">
            <Routes>
              <Route path="/" element={<Navigate to="/jobs" replace />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/departments/:id" element={<DepartmentDetail />} />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/jobs/new" element={<JobWizard />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/jobs/:id/edit" element={<JobWizard />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/candidates/:id" element={<CandidateDetail />} />
            </Routes>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
