import React, { useState } from 'react';
import { Bell, Briefcase, UserPlus, FileText, CheckCircle } from 'lucide-react';

// Mock data
const MOCK_NOTIFICATIONS = [
    { id: 1, type: 'candidate', message: 'Jane added a note to candidate Shawn', time: '2 hours ago', user: 'Jane' },
    { id: 2, type: 'job', message: 'Job "Senior React Developer" was published by Josh', time: '5 hours ago', user: 'Josh' },
    { id: 3, type: 'user', message: 'Ben approved the offer for Shawn', time: '1 day ago', user: 'Ben' },
    { id: 4, type: 'candidate', message: 'Interview scheduled with Jerry', time: '1 day ago', user: 'System' },
    { id: 5, type: 'department', message: 'Kale updated department Professional Services', time: '2 days ago', user: 'Kale' },
    { id: 6, type: 'system', message: 'System maintenance scheduled for Saturday', time: '3 days ago', user: 'Admin' },
    { id: 7, type: 'candidate', message: 'Resume parsing completed for 5 new applicants', time: '3 days ago', user: 'System' },
];

const NotificationsWidget = () => {
    const [showAll, setShowAll] = useState(false);

    // Display 5 items by default, or all if expanded
    const visibleNotifications = showAll ? MOCK_NOTIFICATIONS : MOCK_NOTIFICATIONS.slice(0, 5);

    const getIcon = (type) => {
        switch (type) {
            case 'candidate': return <div className="p-2 rounded-full bg-green-100 text-green-600"><FileText size={16} /></div>;
            case 'user': return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><UserPlus size={16} /></div>;
            case 'department': return <div className="p-2 rounded-full bg-gray-100 text-gray-600"><Briefcase size={16} /></div>;
            case 'job': return <div className="p-2 rounded-full bg-purple-100 text-purple-600"><Briefcase size={16} /></div>;
            default: return <div className="p-2 rounded-full bg-gray-100 text-gray-400"><Bell size={16} /></div>;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">NOTIFICATIONS</h3>
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    {showAll ? 'Show Less' : 'View more'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {visibleNotifications.map(notif => (
                    <div key={notif.id} className="flex items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mr-3">
                            {getIcon(notif.type)}
                        </div>
                        <div>
                            <p className="text-sm text-gray-800">{notif.message}</p>
                            <span className="text-xs text-gray-400 mt-1 block">{notif.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationsWidget;
