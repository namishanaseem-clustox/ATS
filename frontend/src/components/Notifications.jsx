import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';

const Notifications = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Mock notifications for Phase B demo
    const [notifications, setNotifications] = useState([
        { id: 1, title: "New Candidate", text: "Alex Johnson applied for Frontend Developer", time: "10m ago", unread: true, type: 'candidate' },
        { id: 2, title: "Interview Reminder", text: "Interview with Sarah Smith in 30 mins", time: "30m ago", unread: true, type: 'interview' },
        { id: 3, title: "Team Activity", text: "Mike moved Brian to Technical Interface", time: "2h ago", unread: false, type: 'activity' },
    ]);

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
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
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
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${n.unread ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm ${n.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{n.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{n.text}</p>
                                    </div>
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
