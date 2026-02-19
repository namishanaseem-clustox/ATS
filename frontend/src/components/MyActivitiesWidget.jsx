import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, Phone, Users, ChevronRight, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyInterviews } from '../api/activities';

const MyActivitiesWidget = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const data = await getMyInterviews();
                // Filter for pending only and take top 5
                const pending = data.filter(a => a.status === 'Pending')
                    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                    .slice(0, 5);
                setActivities(pending);
            } catch (error) {
                console.error("Failed to fetch activities", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'Interview': return <Video size={16} className="text-purple-600" />;
            case 'Call': return <Phone size={16} className="text-blue-600" />;
            case 'Meeting': return <Users size={16} className="text-orange-600" />;
            default: return <Calendar size={16} className="text-gray-600" />;
        }
    };

    if (loading) return <div className="animate-pulse h-48 bg-gray-100 rounded-lg"></div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 mt-6">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">MY ACTIVITIES</h3>
                <button
                    onClick={() => navigate('/my-interviews')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    View more
                </button>
            </div>

            {activities.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                    <Calendar size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">No pending activities</p>
                    <button onClick={() => navigate('/jobs')} className="mt-2 text-xs text-blue-600 flex items-center">
                        <PlusCircle size={12} className="mr-1" /> Schedule something
                    </button>
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {activities.map(activity => (
                        <div
                            key={activity.id}
                            onClick={() => navigate('/my-interviews')}
                            className="flex items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0 cursor-pointer group"
                        >
                            <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${activity.activity_type === 'Interview' ? 'bg-purple-100' :
                                activity.activity_type === 'Call' ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                {getIcon(activity.activity_type)}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                    {activity.title}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <Clock size={12} className="mr-1" />
                                    {new Date(activity.scheduled_at).toLocaleDateString()} at {new Date(activity.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {activity.candidate && (
                                    <p className="text-xs text-gray-400 mt-1 truncate">
                                        w/ {activity.candidate.first_name} {activity.candidate.last_name}
                                    </p>
                                )}
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 self-center" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyActivitiesWidget;
