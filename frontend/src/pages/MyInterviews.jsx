
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Briefcase, MapPin, Search, ChevronRight, Star } from 'lucide-react';
import { getMyInterviews } from '../api/activities';
import ScorecardModal from '../components/ScorecardModal';
import { Link } from 'react-router-dom';

const MyInterviews = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const data = await getMyInterviews();
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch interviews", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRate = (activity) => {
        setSelectedActivity(activity);
        setIsScoreModalOpen(true);
    };

    const filteredActivities = activities.filter(activity =>
        (activity.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.candidate?.first_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activity.candidate?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const pendingInterviews = filteredActivities.filter(a => a.status === 'Pending');
    const completedInterviews = filteredActivities.filter(a => a.status === 'Completed');

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading your interviews...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Interviews</h1>
                    <p className="text-gray-500">Scheduled activities assigned to you</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search interviews..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 outline-none w-64 text-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Pending Section */}
            <div className="mb-12">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-orange-500" />
                    Upcoming / Pending
                    <span className="ml-3 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                        {pendingInterviews.length}
                    </span>
                </h2>

                {pendingInterviews.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
                        No pending interviews found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingInterviews.map((activity) => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                onRate={() => handleRate(activity)}
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
                        {completedInterviews.length}
                    </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedInterviews.map((activity) => (
                        <ActivityCard
                            key={activity.id}
                            activity={activity}
                            completed
                        />
                    ))}
                </div>
            </div>

            {selectedActivity && (
                <ScorecardModal
                    isOpen={isScoreModalOpen}
                    onClose={() => setIsScoreModalOpen(false)}
                    activity={selectedActivity}
                    onSave={() => {
                        fetchInterviews();
                        setIsScoreModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

const ActivityCard = ({ activity, onRate, completed = false }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden">
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${activity.activity_type === 'Interview' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {activity.activity_type}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(activity.scheduled_at).toLocaleDateString()}
                    </span>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{activity.title}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    <span>{activity.candidate ? `${activity.candidate.first_name} ${activity.candidate.last_name}` : 'Unknown Candidate'}</span>
                </div>

                <div className="space-y-2 text-sm text-gray-500 mb-6">
                    <div className="flex items-center">
                        <Briefcase className="h-3.5 w-3.5 mr-2" />
                        {activity.job?.title || 'No Job Linked'}
                    </div>
                    {activity.location && (
                        <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-2" />
                            <span className="truncate">{activity.location}</span>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t flex justify-between items-center">
                    <Link
                        to={`/candidates/${activity.candidate_id}`}
                        className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center"
                    >
                        View Profile <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                    {!completed ? (
                        <button
                            onClick={onRate}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        >
                            Submit Feedback
                        </button>
                    ) : (
                        <span className="text-xs font-medium text-gray-400 italic">Completed</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyInterviews;
