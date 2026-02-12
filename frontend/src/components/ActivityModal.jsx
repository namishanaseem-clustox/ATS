import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Clock, AlignLeft, Users, Briefcase } from 'lucide-react';
import { getJobCandidates, getCandidate } from '../api/candidates';
import { createActivity, updateActivity } from '../api/activities';

const ActivityModal = ({ isOpen, onClose, activity = null, jobId, candidateId = null, onSave }) => {
    const [formData, setFormData] = useState({
        activity_type: 'Task',
        title: '',
        status: 'Pending',
        scheduled_at: '',
        location: '',
        description: '',
        participants: '', // Comma separated for now
        candidate_id: candidateId || '',
        job_id: jobId || ''
    });

    const [candidates, setCandidates] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (jobId) {
                fetchCandidates();
            } else if (candidateId) {
                fetchCandidateJobs();
            }
        }

        if (activity) {
            setFormData({
                ...activity,
                scheduled_at: activity.scheduled_at ? activity.scheduled_at.slice(0, 16) : '', // format for datetime-local
                participants: Array.isArray(activity.participants) ? activity.participants.join(', ') : '',
                candidate_id: activity.candidate_id || ''
            });
        } else {
            // Reset form for new activity
            setFormData({
                activity_type: 'Task',
                title: '',
                status: 'Pending',
                scheduled_at: '',
                location: '',
                description: '',
                participants: '',
                candidate_id: candidateId || '',
                job_id: jobId
            });
        }
    }, [isOpen, activity, jobId, candidateId]);

    const fetchCandidates = async () => {
        try {
            const data = await getJobCandidates(jobId);
            // data is list of JobApplication, need candidate details
            setCandidates(data.map(app => app.candidate));
        } catch (error) {
            console.error("Failed to fetch candidates", error);
        }
    };

    const fetchCandidateJobs = async () => {
        try {
            const data = await getCandidate(candidateId);
            if (data.applications) {
                setJobs(data.applications.map(app => app.job).filter(job => job));
            }
        } catch (error) {
            console.error("Failed to fetch candidate jobs", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                participants: formData.participants.split(',').map(p => p.trim()).filter(p => p),
                scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
                candidate_id: formData.candidate_id || null // Ensure null if empty string
            };

            let savedActivity;
            if (activity) {
                savedActivity = await updateActivity(activity.id, payload);
            } else {
                savedActivity = await createActivity(payload);
            }

            onSave(savedActivity);
            onClose();
        } catch (error) {
            console.error("Failed to save activity", error);
            alert("Failed to save activity");
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

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Title & Type */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        name="activity_type"
                                        value={formData.activity_type}
                                        onChange={handleChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                                    >
                                        <option value="Task">Task</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Interview">Interview</option>
                                        <option value="Call">Call</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                        placeholder="e.g. Initial Screening"
                                    />
                                </div>
                            </div>

                            {/* Context Selection (Candidate or Job) */}
                            {jobId ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                                        <User className="h-4 w-4 mr-2" />
                                        Related Candidate
                                    </label>
                                    <select
                                        name="candidate_id"
                                        value={formData.candidate_id}
                                        onChange={handleChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">-- None --</option>
                                        {candidates.map(candidate => (
                                            <option key={candidate.id} value={candidate.id}>
                                                {candidate.first_name} {candidate.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                                        <Briefcase className="h-4 w-4 mr-2" />
                                        Related Job
                                    </label>
                                    <select
                                        name="job_id"
                                        value={formData.job_id}
                                        onChange={handleChange}
                                        required={!jobId}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">-- Select Job --</option>
                                        {jobs.map(job => (
                                            <option key={job.id} value={job.id}>
                                                {job.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    name="scheduled_at"
                                    value={formData.scheduled_at}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                />
                            </div>

                            {/* Location */}
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

                            {/* Participants */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    Participants (Internal)
                                </label>
                                <input
                                    type="text"
                                    name="participants"
                                    value={formData.participants}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="Jane Doe, John Smith (comma separated)"
                                />
                            </div>

                            {/* Description */}
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

                            {/* Status (Edit only) */}
                            {activity && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
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
