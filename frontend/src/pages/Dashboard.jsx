import React from 'react';
import { useAuth } from '../context/AuthContext';
import useDepartmentStore from '../store/useDepartmentStore';
import TaskInboxWidget from '../components/TaskInboxWidget';
import NotificationsWidget from '../components/NotificationsWidget';
import RecentActionsWidget from '../components/RecentActionsWidget';
import MyActivitiesWidget from '../components/MyActivitiesWidget';
import TopPerformersWidget from '../components/TopPerformersWidget';
import MyPerformanceChartWidget from '../components/MyPerformanceChartWidget'; // We will create this next

const Dashboard = () => {
  const { user } = useAuth();
  const { currentDepartment } = useDepartmentStore();

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome, {user?.display_name || user?.full_name || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">Here is what needs your attention today.</p>
      </div>

      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
            {/* If there are urgent tasks, keep task inbox, else hide or move to secondary */}
            <NotificationsWidget />
            <RecentActionsWidget />
            <MyActivitiesWidget />
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
            <TopPerformersWidget />
            <MyPerformanceChartWidget />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
