import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle, Circle, XCircle, Edit2, Trash2, Phone, Video, FileText, Mic } from 'lucide-react';
import { getJobActivities, getCandidateActivities, deleteActivity } from '../api/activities';
import ActivityModal from './ActivityModal';

const ActivityList = ({ jobId, candidateId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);

    useEffect(() => {
        fetchActivities();
    }, [jobId, candidateId]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            let data = [];
            if (candidateId) {
                data = await getCandidateActivities(candidateId);
            } else if (jobId) {
                data = await getJobActivities(jobId);
            }
            // Sort by scheduled_at desc
            data.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch activities", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (activity) => {
        setSelectedActivity(activity);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this activity?")) return;
        try {
            await deleteActivity(id);
            setActivities(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Failed to delete activity", error);
        }
    };

    const handleSave = (savedActivity) => {
        fetchActivities(); // Refresh list to handle both create and update easily
        setIsModalOpen(false);
        setSelectedActivity(null);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Meeting': return <Users className="h-5 w-5 text-blue-500" />;
            case 'Interview': return <Video className="h-5 w-5 text-purple-500" />;
            case 'Call': return <Phone className="h-5 w-5 text-green-500" />;
            default: return <FileText className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Pending: "bg-yellow-100 text-yellow-800",
            Completed: "bg-green-100 text-green-800",
            Cancelled: "bg-red-100 text-red-800"
        };
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || styles.Pending}`}>
                {status}
            </span>
        );
    };

    if (loading) return <div className="text-gray-500 text-center py-4">Loading activities...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Scheduled Activities</h3>
                <button
                    onClick={() => { setSelectedActivity(null); setIsModalOpen(true); }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Add Activity
                </button>
            </div>

            {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No activities scheduled.</p>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {activities.map((activity) => (
                            <li key={activity.id}>
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            {getIcon(activity.activity_type)}
                                            <p className="ml-3 text-sm font-medium text-indigo-600 truncate">{activity.title}</p>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            {getStatusBadge(activity.status)}
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                {/* Candidate name might need backend join or additional fetch if not eager loaded. 
                                                    For now, using ID or if backend sends it. 
                                                    The backend model has relationship, but Pydantic Schema 'ActivityBase' doesn't explicitly include nested Candidate object, only ID.
                                                    We might need to update backend to include candidate name or fetch it.
                                                    Let's assume for now we just show "Candidate" or wait for backend update if needed.
                                                 */}
                                                {activity.participants && activity.participants.length > 0 ? activity.participants.join(', ') : 'No participants'}
                                            </p>
                                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                {activity.location || 'Remote'}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                            <p>
                                                {activity.scheduled_at ? new Date(activity.scheduled_at).toLocaleString() : 'Unscheduled'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end space-x-2">
                                        <button onClick={() => handleEdit(activity)} className="text-indigo-600 hover:text-indigo-900">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(activity.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ActivityModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                activity={selectedActivity}
                jobId={jobId}
                candidateId={candidateId}
                onSave={handleSave}
            />
        </div>
    );
};

export default ActivityList;
