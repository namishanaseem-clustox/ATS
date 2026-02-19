import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, FileText } from 'lucide-react';
import { getJobCandidates, getCandidate } from '../api/candidates';
import { createActivity, updateActivity } from '../api/activities';
import CustomSelect from './CustomSelect';

const NOTE_TYPE_OPTIONS = [
    { value: 'General', label: '📝 General' },
    { value: 'Screening', label: '🔍 Screening' },
    { value: 'Interview', label: '🎤 Interview' },
    { value: 'Evaluation', label: '⭐ Evaluation' },
    { value: 'Offer', label: '📄 Offer' },
    { value: 'Reference Check', label: '📞 Reference Check' },
];

const NoteModal = ({ isOpen, onClose, note = null, jobId, candidateId = null, onSave }) => {
    const [formData, setFormData] = useState({
        activity_type: 'Note',
        title: '',
        status: 'Pending',
        description: '',
        candidate_id: candidateId || '',
        job_id: jobId || '',
        details: { note_type: 'General' }
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

        if (note) {
            setFormData({
                ...note,
                candidate_id: note.candidate_id || '',
                job_id: note.job_id || '',
                details: note.details || { note_type: 'General' }
            });
        } else {
            // Reset form for new note
            setFormData({
                activity_type: 'Note',
                title: '',
                status: 'Pending',
                description: '',
                candidate_id: candidateId || '',
                job_id: jobId || '',
                details: { note_type: 'General' }
            });
        }
    }, [isOpen, note, jobId, candidateId]);

    const fetchCandidates = async () => {
        try {
            const data = await getJobCandidates(jobId);
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
                activity_type: 'Note', // Ensure it's always Note
                candidate_id: formData.candidate_id || null,
                job_id: formData.job_id || null,
                participants: [], // Ensure participants is present as empty list
                scheduled_at: null, // Notes don't have a schedule
                details: formData.details || { note_type: 'General' }
            };

            let savedNote;
            if (note) {
                savedNote = await updateActivity(note.id, payload);
            } else {
                savedNote = await createActivity(payload);
            }

            onSave(savedNote);
            onClose();
        } catch (error) {
            console.error("Failed to save note", error);
            alert("Failed to save note");
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
                                {note ? 'Edit Note' : 'Add Note'}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Note Type */}
                            <CustomSelect
                                label="Note Type"
                                value={formData.details?.note_type || 'General'}
                                onChange={(e) => setFormData(prev => ({ ...prev, details: { ...prev.details, note_type: e.target.value } }))}
                                options={NOTE_TYPE_OPTIONS}
                                className="mb-0"
                            />

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="e.g. Screening Notes"
                                />
                            </div>

                            {/* Context Selection (Candidate or Job) */}
                            {jobId ? (
                                <div>
                                    <CustomSelect
                                        label={
                                            <span className="flex items-center">
                                                <User className="h-4 w-4 mr-2" />
                                                Related Candidate (Optional)
                                            </span>
                                        }
                                        name="candidate_id"
                                        value={formData.candidate_id}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "-- None --" },
                                            ...candidates.map(candidate => ({ value: candidate.id, label: `${candidate.first_name} ${candidate.last_name}` }))
                                        ]}
                                        className="mb-0"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <CustomSelect
                                        label={
                                            <span className="flex items-center">
                                                <Briefcase className="h-4 w-4 mr-2" />
                                                Related Job (Optional)
                                            </span>
                                        }
                                        name="job_id"
                                        value={formData.job_id}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "-- None --" },
                                            ...jobs.map(job => ({ value: job.id, label: job.title }))
                                        ]}
                                        className="mb-0"
                                    />
                                </div>
                            )}

                            {/* Note Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                <textarea
                                    name="description"
                                    rows="8"
                                    required
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm font-mono text-sm"
                                    placeholder="Enter your notes here..."
                                ></textarea>
                            </div>
                        </form>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (note ? 'Update Note' : 'Add Note')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default NoteModal;
