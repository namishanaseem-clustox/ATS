import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Clock, AlignLeft, Users, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJobCandidates } from '../api/candidates';
import { getJobs } from '../api/jobs';
import { createActivity, updateActivity } from '../api/activities';
import { getUsers } from '../api/users';
import CustomSelect from './CustomSelect';
import MultiSelect from './MultiSelect';

const ACTIVITY_TYPES = [
    { value: 'Task', label: 'Task' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Interview', label: 'Interview' },
    { value: 'Call', label: 'Call' },
    { value: 'Note', label: 'Note' },
];

const ACTIVITY_STATUSES = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
];

const toDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ActivityModal = ({ isOpen, onClose, activity = null, jobId, candidateId = null, onSave, initialType = 'Task' }) => {
    const { user } = useAuth();
    const isInterviewer = user?.role === 'interviewer';
    // Interviewers editing an existing activity can only change time, link, description, status
    const isRestricted = isInterviewer && !!activity;

    const [formData, setFormData] = useState({
        activity_type: initialType,
        title: '',
        candidate_id: candidateId || '',
        job_id: jobId || '',
        scheduled_at: '',
        location: '',
        participants: '',
        description: '',
        status: 'Pending',
        assignee_ids: [],
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);

    // Pre-fill form when editing
    useEffect(() => {
        if (activity) {
            setFormData({
                activity_type: activity.activity_type || initialType,
                title: activity.title || activity.activity_type || '',
                candidate_id: activity.candidate_id || candidateId || '',
                job_id: activity.job_id || jobId || '',
                scheduled_at: toDatetimeLocal(activity.scheduled_at),
                location: activity.location || '',
                participants: activity.participants || '',
                description: activity.description || '',
                status: activity.status || 'Pending',
                assignee_ids: activity.assignees?.map(a => a.id) || [],
            });
        } else {
            setFormData({
                activity_type: initialType,
                title: '',
                candidate_id: candidateId || '',
                job_id: jobId || '',
                scheduled_at: '',
                location: '',
                participants: '',
                description: '',
                status: 'Pending',
                assignee_ids: [],
            });
        }
    }, [activity, isOpen, jobId, candidateId, initialType]);

    // Fetch related data
    useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            try {
                if (jobId) {
                    const cands = await getJobCandidates(jobId);
                    setCandidates(cands || []);
                }
                if (!jobId) {
                    const jobsList = await getJobs();
                    setJobs(jobsList || []);
                }
                const usersList = await getUsers();
                setUsers(usersList || []);
            } catch (err) {
                console.error('Failed to fetch modal data:', err);
            }
        };
        fetchData();
    }, [isOpen, jobId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...formData,
                job_id: formData.job_id || jobId || null,
                candidate_id: formData.candidate_id || candidateId || null,
                scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
            };
            let saved;
            if (activity?.id) {
                saved = await updateActivity(activity.id, payload);
            } else {
                saved = await createActivity(payload);
            }
            if (onSave) onSave(saved);
            onClose();
        } catch (err) {
            console.error('Failed to save activity:', err);
            setError(err.message || 'Failed to save activity. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {activity ? 'Edit Activity' : 'Schedule Activity'}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {isRestricted && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
                                As an interviewer, you can only edit Time, Location/Link, Description, and Status.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Title & Type */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <CustomSelect
                                        label="Type"
                                        name="activity_type"
                                        value={formData.activity_type}
                                        onChange={handleChange}
                                        options={ACTIVITY_TYPES}
                                        className="mb-0"
                                        disabled={isRestricted}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="e.g. Initial Screening"
                                        disabled={isRestricted}
                                    />
                                </div>
                            </div>

                            {/* Context Selection (Candidate or Job) */}
                            {jobId ? (
                                <div>
                                    <CustomSelect
                                        label={
                                            <span className="flex items-center">
                                                <User className="h-4 w-4 mr-2" />
                                                Related Candidate
                                            </span>
                                        }
                                        name="candidate_id"
                                        value={formData.candidate_id}
                                        onChange={handleChange}
                                        options={[
                                            { value: '', label: '-- None --' },
                                            ...candidates.filter(c => c.candidate).map(c => ({ value: c.candidate.id, label: `${c.candidate.first_name} ${c.candidate.last_name}` }))
                                        ]}
                                        className="mb-0"
                                        disabled={isRestricted}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <CustomSelect
                                        label={
                                            <span className="flex items-center">
                                                <Briefcase className="h-4 w-4 mr-2" />
                                                Related Job
                                            </span>
                                        }
                                        name="job_id"
                                        value={formData.job_id}
                                        onChange={handleChange}
                                        required={!jobId}
                                        options={[
                                            { value: '', label: '-- Select Job --' },
                                            ...jobs.map(j => ({ value: j.id, label: j.title }))
                                        ]}
                                        className="mb-0"
                                        disabled={isRestricted}
                                    />
                                </div>
                            )}

                            {/* Date & Time (ALLOWED) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Date &amp; Time
                                </label>
                                <input
                                    type="datetime-local"
                                    name="scheduled_at"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                />
                            </div>

                            {/* Location (ALLOWED) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Location / Link
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="e.g. Conference Room A or Zoom Link"
                                />
                            </div>

                            {/* Participants (RESTRICTED) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    Participants (External)
                                </label>
                                <input
                                    type="text"
                                    name="participants"
                                    value={formData.participants}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                    placeholder="Jane Doe (Client), etc."
                                    disabled={isRestricted}
                                />
                            </div>

                            {/* Assignees (RESTRICTED) */}
                            <div>
                                <MultiSelect
                                    label={
                                        <span className="flex items-center">
                                            <User className="h-4 w-4 mr-2" />
                                            Assign Interviewers
                                        </span>
                                    }
                                    name="assignee_ids"
                                    value={formData.assignee_ids}
                                    onChange={handleChange}
                                    options={users.map(u => ({ value: u.id, label: u.full_name || u.email }))}
                                    placeholder="Select Interviewers..."
                                    className="mb-0"
                                    disabled={isRestricted}
                                />
                            </div>

                            {/* Description (ALLOWED) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center">
                                    <AlignLeft className="h-4 w-4 mr-2" />
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    rows="3"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                ></textarea>
                            </div>

                            {/* Status (Edit only, ALLOWED) */}
                            {activity && (
                                <div>
                                    <CustomSelect
                                        label="Status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        options={ACTIVITY_STATUSES}
                                        className="mb-0"
                                    />
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Activity'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityModal;
