import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentActivities, dismissActivity } from '../api/dashboard';
import { Bell, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Notifications = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: activities, isLoading } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: getRecentActivities,
    });

    const dismissMut = useMutation({
        mutationFn: dismissActivity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
        }
    });

    const [readNotifs, setReadNotifs] = useState(new Set());

    const notifications = (activities || []).map(a => ({
        ...a,
        unread: !readNotifs.has(a.id)
    }));

    const unreadCount = notifications.filter(n => n.unread).length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = () => {
        const newReadSet = new Set(readNotifs);
        notifications.forEach(n => newReadSet.add(n.id));
        setReadNotifs(newReadSet);
    };

    const markAsRead = (id) => {
        const newReadSet = new Set(readNotifs);
        newReadSet.add(id);
        setReadNotifs(newReadSet);
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'Just now';
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getLink = (type, id) => {
        switch (type) {
            case 'candidate_created': return `/candidates/${id}`;
            case 'requisition_pending': return `/requisitions/${id}`;
            case 'job_created': return `/jobs/${id}`;
            default: return '#';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 relative text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center backdrop-blur-sm">
                        <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs font-medium text-[#00C853] hover:text-green-700 flex items-center gap-1"
                            >
                                <Check size={12} /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(n => (
                                    <Link
                                        key={n.id}
                                        to={getLink(n.type, n.id)}
                                        onClick={() => { markAsRead(n.id); setIsOpen(false); }}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group block relative ${n.unread ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1 pr-6">
                                            <h4 className={`text-sm ${n.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700 group-hover:text-blue-600 transition-colors'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{formatTime(n.timestamp)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed pr-6">{n.description}</p>

                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (n.notification_key) {
                                                    dismissMut.mutate(n.notification_key);
                                                }
                                            }}
                                            className="absolute right-3 top-3.5 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-200"
                                            title="Dismiss notification"
                                        >
                                            <X size={14} />
                                        </button>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/30 text-center">
                        <button className="text-xs text-gray-500 hover:text-gray-800 font-medium">View all notifications</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
