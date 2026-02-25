import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Briefcase, MapPin, Search, ChevronRight, Star, List, LayoutGrid, CheckSquare, FileText, Video, Phone, Users, Filter, Edit2, Trash2, Eye, MoreVertical } from 'lucide-react';
import { getAllActivities } from '../api/activities';
import ScorecardModal from '../components/ScorecardModal';
import ActivityModal from '../components/ActivityModal';
import CalendarView from '../components/CalendarView';
import ColumnSelector from '../components/ColumnSelector';
import useColumnPersistence from '../hooks/useColumnPersistence';
import Breadcrumb from '../components/Breadcrumb';
import { Link } from 'react-router-dom';

const ACTIVITY_COLUMNS = [
    { id: 'title', label: 'Title', required: true },
    { id: 'type', label: 'Type' },
    { id: 'relatedTo', label: 'Related To' },
    { id: 'date', label: 'Date' },
    { id: 'time', label: 'Time' },
    { id: 'duration', label: 'Duration' },
    { id: 'assignees', label: 'Assignees' }
];

const Tasks = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [visibleColumns, toggleColumn] = useColumnPersistence('clustox_activities_columns', ACTIVITY_COLUMNS.map(c => c.id));

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

    const filteredActivities = activities.filter(activity => {
        if (activity.activity_type?.toLowerCase() === 'note') return false;

        const query = searchQuery.toLowerCase();
        const matchesSearch =
            (activity.title?.toLowerCase().includes(query)) ||
            (activity.candidate?.first_name?.toLowerCase().includes(query)) ||
            (activity.candidate?.last_name?.toLowerCase().includes(query)) ||
            (activity.activity_type?.toLowerCase().includes(query)) ||
            (activity.job?.title?.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'All' ||
            (statusFilter === 'Pending' && activity.status === 'Pending') ||
            (statusFilter === 'Completed' && (activity.status === 'Completed' || activity.status === 'Cancelled'));

        const matchesType = typeFilter === 'All' || activity.activity_type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (typeFilter !== 'All' ? 1 : 0) + (searchQuery ? 1 : 0);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading your activities...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <Breadcrumb items={[{ label: 'Activities' }]} />
                <div className="flex justify-between items-center mb-6 mt-2">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
                        <p className="text-gray-500 mt-1">Manage and track your tasks, interviews, and calls.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {viewMode === 'list' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
                                <input
                                    type="text"
                                    placeholder="Search by Name, Job, Email or Department"
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm transition-all w-80 shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="bg-white border text-sm border-gray-200 rounded p-1 flex items-center">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center px-3 py-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                <List size={14} className="mr-2" /> List
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center px-3 py-1.5 rounded-sm transition-colors ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                <LayoutGrid size={14} className="mr-2" /> Board
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sub-header: Create button + Filters/Columns left, Results right */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setSelectedActivity(null);
                                setIsEditModalOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            + Create activity
                        </button>

                        {viewMode === 'list' && (
                            <>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <Filter size={16} /> Filters
                                        {activeFilterCount > 0 && (
                                            <span className="bg-[#4caf50] text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </button>

                                    {isFiltersOpen && (
                                        <div className="absolute top-12 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 shrink-0">
                                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                                <h4 className="font-semibold text-gray-800 text-sm">Filter Activities</h4>
                                                <button
                                                    onClick={() => { setStatusFilter('All'); setTypeFilter('All'); }}
                                                    className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                    Reset
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wider uppercase">Status</label>
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="w-full border border-gray-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500 text-gray-700 shadow-sm"
                                                    >
                                                        <option value="All">All Statuses</option>
                                                        <option value="Pending">Pending</option>
                                                        <option value="Completed">Completed</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wider uppercase">Type</label>
                                                    <select
                                                        value={typeFilter}
                                                        onChange={(e) => setTypeFilter(e.target.value)}
                                                        className="w-full border border-gray-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500 text-gray-700 shadow-sm"
                                                    >
                                                        <option value="All">All Types</option>
                                                        <option value="Task">Task</option>
                                                        <option value="Interview">Interview</option>
                                                        <option value="Call">Call</option>
                                                        <option value="Meeting">Meeting</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <ColumnSelector
                                    columns={ACTIVITY_COLUMNS}
                                    visibleColumns={visibleColumns}
                                    onToggle={(id) => {
                                        const col = ACTIVITY_COLUMNS.find(c => c.id === id);
                                        if (col && col.required) return;
                                        toggleColumn(id);
                                    }}
                                />
                            </>
                        )}
                    </div>

                    <div className="text-sm text-gray-500">
                        Results: <span className="font-semibold text-gray-700">{filteredActivities.length}</span>
                    </div>
                </div>

                {viewMode === 'calendar' ? (
                    <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
                        <CalendarView activities={filteredActivities} onRefresh={fetchActivities} />
                    </div>
                ) : (
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                        <ActivitiesTable
                            activities={filteredActivities}
                            visibleColumns={visibleColumns}
                            onEdit={handleEdit}
                            onRate={handleRate}
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedActivity && isScoreModalOpen && (
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

            {isEditModalOpen && (
                <ActivityModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    activity={selectedActivity}
                    jobId={selectedActivity?.job_id}
                    candidateId={selectedActivity?.candidate_id}
                    onSave={() => {
                        fetchActivities();
                        setIsEditModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

const ActivitiesTable = ({ activities, visibleColumns, onEdit, onRate }) => {
    if (activities.length === 0) {
        return <div className="p-16 text-center text-gray-500 bg-white">No activities found matching your criteria.</div>;
    }

    const calculateDuration = (start, end) => {
        if (!start || !end) return '45 Minutes'; // default fallback for mock
        const diff = new Date(end) - new Date(start);
        const mins = Math.floor(diff / 60000);
        if (mins <= 0) return '0 Minutes';
        if (mins < 60) return `${mins} Minutes`;
        const hrs = Math.floor(mins / 60);
        return `${hrs} Hour${hrs > 1 ? 's' : ''}`;
    }

    const getAvatarColor = (name) => {
        const colors = ['bg-[#fbc02d]', 'bg-[#43a047]', 'bg-[#00acc1]', 'bg-[#1e88e5]', 'bg-[#8e24aa]', 'bg-[#f4511e]', 'bg-[#d81b60]'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                        <th className="px-4 py-4 w-12 text-center text-gray-400">
                            <input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5 cursor-pointer accent-blue-600" />
                        </th>
                        {visibleColumns.includes('title') && (
                            <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 group">
                                    Title <span className="text-gray-300 group-hover:text-gray-500">↕</span>
                                </div>
                            </th>
                        )}
                        {visibleColumns.includes('type') && (
                            <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 group">
                                    Type <span className="text-gray-300 group-hover:text-gray-500">↕</span>
                                </div>
                            </th>
                        )}
                        {visibleColumns.includes('relatedTo') && (
                            <th className="px-4 py-4">Related To</th>
                        )}
                        {visibleColumns.includes('date') && (
                            <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 group">
                                    Date <span className="text-gray-300 group-hover:text-gray-500">↕</span>
                                </div>
                            </th>
                        )}
                        {visibleColumns.includes('time') && (
                            <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 group">
                                    Time <span className="text-gray-300 group-hover:text-gray-500">↕</span>
                                </div>
                            </th>
                        )}
                        {visibleColumns.includes('duration') && (
                            <th className="px-4 py-4">Duration</th>
                        )}
                        {visibleColumns.includes('assignees') && (
                            <th className="px-4 py-4">Assignees</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                    {activities.map((activity, index) => {
                        const dateObj = new Date(activity.scheduled_at);
                        const dateStr = activity.scheduled_at ? dateObj.toLocaleDateString() : '-';
                        const timeStr = activity.scheduled_at ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                        const durationStr = calculateDuration(activity.scheduled_at, activity.end_time);

                        const creatorName = activity.creator?.full_name || activity.creator?.first_name || 'System';
                        const initials = creatorName.substring(0, 2).toUpperCase();
                        const colorClass = getAvatarColor(creatorName);

                        // Alternate row backgrounds slightly like Manatal
                        const isEven = index % 2 === 0;

                        return (
                            <tr key={activity.id} className={`hover:bg-gray-50 transition-colors group ${isEven ? 'bg-white' : 'bg-[#fafafa]'}`}>
                                <td className="px-4 py-3.5 text-center text-gray-400">
                                    <input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5 cursor-pointer accent-green-600" />
                                </td>

                                {visibleColumns.includes('title') && (
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center">
                                            <div className="flex-1 truncate max-w-[200px] text-gray-800">
                                                {activity.title}
                                            </div>
                                            <div className="flex items-center space-x-2 text-gray-400 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="hover:text-red-500 transition-colors" title="Delete"><Trash2 size={13} /></button>
                                                <button onClick={() => onEdit(activity)} className="hover:text-green-500 transition-colors" title="View"><Eye size={14} /></button>
                                            </div>
                                        </div>
                                    </td>
                                )}

                                {visibleColumns.includes('type') && (
                                    <td className="px-4 py-3.5 text-gray-600 capitalize">
                                        {activity.activity_type}
                                    </td>
                                )}

                                {visibleColumns.includes('relatedTo') && (
                                    <td className="px-4 py-3.5">
                                        {activity.candidate ? (
                                            <div className="flex flex-col">
                                                <span className="text-gray-700">
                                                    {activity.candidate.first_name} {activity.candidate.last_name}
                                                </span>
                                                {activity.job && <span className="text-[11px] text-gray-400 mt-0.5">{activity.job.title}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                )}

                                {visibleColumns.includes('date') && (
                                    <td className="px-4 py-3.5 text-gray-700">{dateStr}</td>
                                )}

                                {visibleColumns.includes('time') && (
                                    <td className="px-4 py-3.5 text-gray-700">{timeStr}</td>
                                )}

                                {visibleColumns.includes('duration') && (
                                    <td className="px-4 py-3.5 text-gray-700">{durationStr}</td>
                                )}

                                {visibleColumns.includes('assignees') && (
                                    <td className="px-4 py-3.5">
                                        {activity.assignees && activity.assignees.length > 0 ? (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {activity.assignees.map((assignee, i) => {
                                                    const name = assignee.full_name || assignee.first_name || assignee.display_name || assignee.email || 'User';
                                                    const initials = name.substring(0, 2).toUpperCase();
                                                    const color = getAvatarColor(name);
                                                    return (
                                                        <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-full pr-2">
                                                            <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${color}`}>
                                                                {initials}
                                                            </div>
                                                            <span className="text-xs text-gray-600 whitespace-nowrap">{name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">—</span>
                                        )}
                                    </td>
                                )}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default Tasks;
