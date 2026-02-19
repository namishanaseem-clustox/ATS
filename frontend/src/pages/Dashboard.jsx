import React from 'react';
import { useAuth } from '../context/AuthContext';
import useDepartmentStore from '../store/useDepartmentStore';
import NotificationsWidget from '../components/NotificationsWidget';
import TopPerformersWidget from '../components/TopPerformersWidget';
import RecentActionsWidget from '../components/RecentActionsWidget';
import MyActivitiesWidget from '../components/MyActivitiesWidget';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentDepartment } = useDepartmentStore();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Home</h1>

      <div className="grid grid-cols-12 gap-6">

        {/* Left Column (Main Content) - Spans 8 cols */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Notifications Section */}
          <NotificationsWidget />

          {/* Recent Actions Section */}
          <RecentActionsWidget />

          {/* My Activities Section */}
          <MyActivitiesWidget />
        </div>

        {/* Right Column (Sidebar Widgets) - Spans 4 cols */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Top Performers Widget */}
          <TopPerformersWidget />

          {/* My Performance (Placeholder for charts) */}
          {/* My Performance (Bar Chart Mock) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-64 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <p className="font-bold text-gray-500 uppercase text-xs">MY PERFORMANCE</p>
              <span className="text-xs text-green-600 font-medium">+12% vs last month</span>
            </div>

            <div className="flex-1 flex items-end justify-between px-2 space-x-2">
              {/* Mock Chart Bars */}
              <div className="w-full flex-col flex items-center group">
                <div className="w-full bg-blue-100 rounded-t h-16 group-hover:bg-blue-200 transition-colors relative"></div>
                <span className="text-[10px] text-gray-400 mt-2">Week 1</span>
              </div>
              <div className="w-full flex-col flex items-center group">
                <div className="w-full bg-blue-100 rounded-t h-24 group-hover:bg-blue-200 transition-colors relative"></div>
                <span className="text-[10px] text-gray-400 mt-2">Week 2</span>
              </div>
              <div className="w-full flex-col flex items-center group">
                <div className="w-full bg-blue-500 rounded-t h-32 relative shadow-lg shadow-blue-200">
                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-blue-600">24</span>
                </div>
                <span className="text-[10px] font-bold text-gray-600 mt-2">Week 3</span>
              </div>
              <div className="w-full flex-col flex items-center group">
                <div className="w-full bg-blue-100 rounded-t h-20 group-hover:bg-blue-200 transition-colors relative"></div>
                <span className="text-[10px] text-gray-400 mt-2">Week 4</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
