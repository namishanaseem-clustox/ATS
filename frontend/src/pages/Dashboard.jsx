import React, { useState, useEffect } from 'react';
import {
  getDashboardOverview,
  getRecentActivities,
  getTopPerformers,
  getActionsTaken,
  getMyPerformance
} from '../api/dashboard';
import { Users, TrendingUp, Activity, Award, BarChart3, Calendar, UserCheck, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MyInterviews from './MyInterviews';
import WelcomeModal from '../components/WelcomeModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topPerformers, setTopPerformers] = useState(null);
  const [actionsTaken, setActionsTaken] = useState([]);
  const [myPerformance, setMyPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Only fetch comprehensive dashboard data for owner and HR roles
        if (['owner', 'hr'].includes(user?.role)) {
          const [overviewData, activitiesData, performersData, actionsData, performanceData] = await Promise.all([
            getDashboardOverview(),
            getRecentActivities(),
            getTopPerformers(),
            getActionsTaken(),
            getMyPerformance()
          ]);

          setOverview(overviewData);
          setRecentActivities(activitiesData);
          setTopPerformers(performersData);
          setActionsTaken(actionsData);
          setMyPerformance(performanceData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  // For interviewers and hiring managers, show personalized dashboard
  if (!['owner', 'hr'].includes(user?.role)) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.full_name || user?.email}!</h1>
          <p className="text-gray-500 mt-2">Here's your personalized dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Role-specific welcome card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Your Role</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{user?.role}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {user?.role === 'interviewer' && 'Manage your interview schedule'}
                  {user?.role === 'hiring_manager' && 'Oversee your job postings'}
                </p>
              </div>
              <div className="text-blue-500 bg-blue-50 p-3 rounded-full">
                {user?.role === 'interviewer' ? <UserCheck size={24} /> : <Briefcase size={24} />}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Quick Actions</p>
                <p className="text-xl font-bold text-gray-900">Get Started</p>
                <p className="text-xs text-gray-500 mt-1">
                  {user?.role === 'interviewer' && 'View your interviews'}
                  {user?.role === 'hiring_manager' && 'Manage your jobs'}
                </p>
              </div>
              <div className="text-green-500 bg-green-50 p-3 rounded-full">
                <Activity size={24} />
              </div>
            </div>
          </div>

          {/* Profile info */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Profile</p>
                <p className="text-xl font-bold text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">Account settings</p>
              </div>
              <div className="text-purple-500 bg-purple-50 p-3 rounded-full">
                <Users size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Show MyInterviews for interviewers and hiring managers */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Calendar size={18} className="mr-2" />
            Your Interview Schedule
          </h3>
          <MyInterviews />
        </div>
      </div>
    );
  }

  // For owner and HR, show full dashboard
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of your ATS system performance and activities</p>
      </div>

      <WelcomeModal />

      {/* Today's Focus Panel - Hooked Model Trigger */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="bg-white/20 p-1.5 rounded-lg mr-3">🎯</span>
          Today's Focus
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium mb-1">Interviews Today</p>
                <p className="text-3xl font-bold">3</p>
              </div>
              <span className="bg-white/20 p-1.5 rounded text-xs font-semibold">Urgent</span>
            </div>
            <p className="text-xs text-indigo-100 mt-3 flex items-center">
              Next: Frontend Dev w/ Sarah <span className="ml-auto opacity-75">10:00 AM</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium mb-1">New Candidates</p>
                <p className="text-3xl font-bold">12</p>
              </div>
              <span className="bg-green-400/20 text-green-300 p-1.5 rounded text-xs font-semibold">Pending Review</span>
            </div>
            <button
              onClick={() => navigate('/candidates')}
              className="text-xs bg-white/10 hover:bg-white/20 py-1.5 px-3 rounded-md mt-3 w-full text-center transition-colors"
            >
              Review Candidates →
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium mb-1">Jobs Expiring</p>
                <p className="text-3xl font-bold">2</p>
              </div>
              <Activity size={16} className="text-orange-300" />
            </div>
            <p className="text-xs text-indigo-100 mt-3">
              Senior PM & Product Designer
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{overview.total_jobs}</p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp size={12} className="inline mr-1" />
                  +{overview.recent_jobs} this month
                </p>
              </div>
              <div className="text-blue-500 bg-blue-50 p-3 rounded-full">
                <BarChart3 size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Candidates</p>
                <p className="text-2xl font-bold text-gray-900">{overview.total_candidates}</p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp size={12} className="inline mr-1" />
                  +{overview.recent_candidates} this month
                </p>
              </div>
              <div className="text-green-500 bg-green-50 p-3 rounded-full">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{overview.active_jobs}</p>
                <p className="text-xs text-gray-500 mt-1">Currently published</p>
              </div>
              <div className="text-purple-500 bg-purple-50 p-3 rounded-full">
                <Activity size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Hires</p>
                <p className="text-2xl font-bold text-gray-900">{overview.hires_count}</p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>
              <div className="text-orange-500 bg-orange-50 p-3 rounded-full">
                <Award size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Activity size={18} className="mr-2" />
            Recent Activities
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start p-3 border-l-2 border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-shrink-0 w-2 h-2 bg-gray-300 rounded-full mt-2 mr-3"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            )}
          </div>
        </div>

        {/* Top Performers */}
        {topPerformers && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Award size={18} className="mr-2" />
              Top Performers
            </h3>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Hiring Managers</h4>
              <div className="space-y-2">
                {topPerformers.top_hiring_managers.length > 0 ? (
                  topPerformers.top_hiring_managers.map((manager, index) => (
                    <div key={manager.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{manager.name}</p>
                          <p className="text-xs text-gray-500">{manager.email}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{manager.jobs_count} jobs</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No hiring managers found</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Interviewers</h4>
              <div className="space-y-2">
                {topPerformers.top_interviewers.length > 0 ? (
                  topPerformers.top_interviewers.map((interviewer, index) => (
                    <div key={interviewer.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-green-100 text-green-600 text-xs font-bold rounded-full flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{interviewer.name}</p>
                          <p className="text-xs text-gray-500">{interviewer.email}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">{interviewer.activities_count} activities</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No interviewers found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Taken Leaderboard */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <TrendingUp size={18} className="mr-2" />
          Actions Taken Leaderboard
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionsTaken.length > 0 ? (
            actionsTaken.map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-indigo-100 text-indigo-600 text-sm font-bold rounded-full flex items-center justify-center mr-3">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-indigo-600">{user.actions_count}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full text-center py-8">No actions data available</p>
          )}
        </div>
      </div>

      {/* My Performance */}
      {myPerformance && (
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <BarChart3 size={18} className="mr-2" />
            My Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Jobs Created:</span>
                  <span className="text-sm font-bold text-gray-900">{myPerformance.total_jobs_created}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Applications:</span>
                  <span className="text-sm font-bold text-gray-900">{myPerformance.total_applications_received}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Monthly Trend</h4>
              <div className="space-y-2">
                {Object.values(myPerformance.metrics_by_month).map((month, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{month.month}:</span>
                    <span className="font-medium">
                      {month.jobs_created} jobs, {month.applications_received} apps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
