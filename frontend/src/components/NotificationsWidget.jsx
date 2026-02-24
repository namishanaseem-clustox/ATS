import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentActivities, dismissActivity } from '../api/dashboard';
import { Bell, Briefcase, UserPlus, FileText, CheckCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationsWidget = () => {
    const [showAll, setShowAll] = useState(false);
    const queryClient = useQueryClient();

    const { data: activities, isLoading, isError } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: getRecentActivities,
    });

    const dismissMut = useMutation({
        mutationFn: dismissActivity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
        }
    });

    if (isLoading) return <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">Loading notifications...</div>;
    if (isError) return <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-red-500">Failed to load notifications.</div>;

    const notifications = activities || [];
    const visibleNotifications = showAll ? notifications : notifications.slice(0, 5);

    const getIcon = (type) => {
        switch (type) {
            case 'candidate_created': return <div className="p-2 rounded-full bg-green-100 text-green-600"><FileText size={16} /></div>;
            case 'user_created': return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><UserPlus size={16} /></div>;
            case 'requisition_pending': return <div className="p-2 rounded-full bg-yellow-100 text-yellow-600"><CheckCircle size={16} /></div>;
            case 'job_created': return <div className="p-2 rounded-full bg-purple-100 text-purple-600"><Briefcase size={16} /></div>;
            default: return <div className="p-2 rounded-full bg-gray-100 text-gray-400"><Bell size={16} /></div>;
        }
    };

    const getLink = (type, id) => {
        switch (type) {
            case 'candidate_created': return `/candidates/${id}`;
            case 'requisition_pending': return `/requisitions/${id}`;
            case 'job_created': return `/jobs/${id}`;
            default: return '#';
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'Just now';
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleDismiss = (e, key) => {
        e.preventDefault();
        e.stopPropagation();
        if (key) dismissMut.mutate(key);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">NOTIFICATIONS</h3>
                {notifications.length > 5 && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {showAll ? 'Show Less' : 'View more'}
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">No recent activities</div>
                ) : (
                    visibleNotifications.map((notif, idx) => (
                        <Link key={idx} to={getLink(notif.type, notif.id)} className="flex items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0 hover:bg-gray-50 transition-colors p-2 rounded -mx-2 relative group">
                            <div className="flex-shrink-0 mr-3">
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0 mr-6">
                                <p className="text-sm text-gray-800 hover:text-blue-600 truncate">{notif.title}</p>
                                {notif.description && <p className="text-xs text-gray-600 mt-0.5 truncate">{notif.description}</p>}
                                <span className="text-xs text-gray-400 mt-1 block">{formatTime(notif.timestamp)}</span>
                            </div>
                            <button
                                onClick={(e) => handleDismiss(e, notif.notification_key)}
                                className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-200"
                                title="Dismiss notification"
                            >
                                <X size={14} />
                            </button>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsWidget;
