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

    // Manatal style uses circular initials for the actor
    const getAvatar = (actorName, overrideColor) => {
        const initial = actorName ? actorName[0].toUpperCase() : 'S';
        const colorClass = overrideColor || 'bg-[#7CB342] text-white'; // Default Manatal green
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${colorClass}`}>
                {initial}
            </div>
        );
    };

    const getLink = (type, id) => {
        switch (type) {
            case 'candidate_created': return `/candidates/${id}`;
            case 'requisition_pending': return `/requisitions/${id}`;
            case 'job_created': return `/jobs/${id}`;
            case 'activity_assigned': return `/tasks`;
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
        <div className="bg-white shadow-sm border border-gray-200 h-[400px] flex flex-col relative w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-900 text-[15px] uppercase tracking-wide">NOTIFICATIONS</h3>
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
                        <Link key={idx} to={getLink(notif.type, notif.id)} className="flex items-start border-b border-gray-100 pb-4 pt-2 last:border-0 last:pb-0 hover:bg-gray-50/50 transition-colors px-4 group">
                            <div className="mr-4 mt-1">
                                {getAvatar(notif.user || 'System')}
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <p className="text-[13px] text-gray-800 leading-snug">
                                    <span className="font-semibold">{notif.user || 'System'}</span> {notif.title.replace(notif.user || 'System', '').trim()}
                                </p>
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
