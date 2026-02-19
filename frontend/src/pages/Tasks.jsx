import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Briefcase, MapPin, Search, ChevronRight, Star, List, LayoutGrid, CheckSquare, FileText, Video, Phone, Users } from 'lucide-react';
import { getAllActivities } from '../api/activities';
import ScorecardModal from '../components/ScorecardModal';
import ActivityModal from '../components/ActivityModal';
import CalendarView from '../components/CalendarView';
import { Link } from 'react-router-dom';

const Tasks = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const data = await getAllActivities();
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch activities", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRate = (activity) => {
        setSelectedActivity(activity);
        setIsScoreModalOpen(true);
    };

    const handleEdit = (activity) => {
        setSelectedActivity(activity);
        setIsEditModalOpen(true);
    };

    const filteredActivities = activities.filter(activity =>
        (activity.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.candidate?.first_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.candidate?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.activity_type?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const pendingActivities = filteredActivities.filter(a => a.status === 'Pending');
    const completedActivities = filteredActivities.filter(a => a.status === 'Completed' || a.status === 'Cancelled');

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading your tasks...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
                    <p className="text-gray-500">Manage your interviews, meetings, and to-dos</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="List View"
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Calendar View"
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>

                    {/* Search (only for list view, though could work for calendar too potentially) */}
                    {viewMode === 'list' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 outline-none w-64 text-sm transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <CalendarView activities={filteredActivities} onRefresh={fetchActivities} />
            ) : (
                <>
                    {/* Pending Section */}
                    <div className="mb-12">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-orange-500" />
                            Upcoming / Pending
                            <span className="ml-3 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                                {pendingActivities.length}
                            </span>
                        </h2>

                        {pendingActivities.length === 0 ? (
                            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
                                No pending tasks found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingActivities.map((activity) => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        onRate={() => handleRate(activity)}
                                        onEdit={() => handleEdit(activity)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completed Section */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <Star className="h-5 w-5 mr-2 text-green-500" />
                            Recently Completed
                            <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full font-medium">
                                {completedActivities.length}
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedActivities.map((activity) => (
                                <ActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    completed
                                    onEdit={() => handleEdit(activity)}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            {selectedActivity && (
                <ScorecardModal
                    isOpen={isScoreModalOpen}
                    onClose={() => setIsScoreModalOpen(false)}
                    activity={selectedActivity}
                    onSave={() => {
                        fetchActivities();
                        setIsScoreModalOpen(false);
                    }}
                />
            )}

            {selectedActivity && (
                <ActivityModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    activity={selectedActivity}
                    jobId={selectedActivity.job_id}
                    candidateId={selectedActivity.candidate_id}
                    onSave={() => {
                        fetchActivities();
                        setIsEditModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

const ActivityCard = ({ activity, onRate, onEdit, completed = false }) => {
    let typeConfig = { bg: 'bg-gray-100', text: 'text-gray-700', icon: CalendarIcon };

    switch (activity.activity_type) {
        case 'Interview': typeConfig = { bg: 'bg-purple-100', text: 'text-purple-700', icon: Video }; break;
        case 'Call': typeConfig = { bg: 'bg-blue-100', text: 'text-blue-700', icon: Phone }; break;
        case 'Meeting': typeConfig = { bg: 'bg-orange-100', text: 'text-orange-700', icon: Users }; break;
        case 'Task': typeConfig = { bg: 'bg-green-100', text: 'text-green-700', icon: CheckSquare }; break;
        case 'Note': typeConfig = { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText }; break;
    }

    const TypeIcon = typeConfig.icon;

    return (
        <div
            onClick={onEdit}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden cursor-pointer group"
        >
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${typeConfig.bg} ${typeConfig.text}`}>
                        <TypeIcon size={10} />
                        {activity.activity_type}
                    </span>
                    {activity.scheduled_at && (
                        <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(activity.scheduled_at).toLocaleDateString()}
                        </span>
                    )}
                </div>

                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{activity.title}</h3>

                {activity.candidate ? (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        <span>{activity.candidate.first_name} {activity.candidate.last_name}</span>
                    </div>
                ) : (
                    <div className="h-9 mb-4"></div> // Spacer to keep card alignment if no candidate
                )}

                <div className="space-y-2 text-sm text-gray-500 mb-6 min-h-[40px]">
                    <div className="flex items-center">
                        <Briefcase className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        <span className="truncate">{activity.job?.title || 'General Task'}</span>
                    </div>
                    {activity.location && (
                        <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                            <span className="truncate">{activity.location}</span>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t flex justify-between items-center h-10">
                    {activity.candidate ? (
                        <Link
                            to={`/candidates/${activity.candidate_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center"
                        >
                            View Profile <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Link>
                    ) : (
                        <div></div>
                    )}

                    {!completed && activity.activity_type === 'Interview' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRate(); }}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        >
                            Submit Feedback
                        </button>
                    )}

                    {completed && <span className="text-xs font-medium text-gray-400 italic">Completed</span>}
                </div>
            </div>
        </div>
    );
};

export default Tasks;
