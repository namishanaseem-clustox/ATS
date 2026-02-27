import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Clock, AlignLeft, Users, Briefcase, ClipboardList, Check, AlertTriangle, CalendarDays, Pencil } from 'lucide-react';
import SlotPickerModal from './SlotPickerModal';
import { useAuth } from '../context/AuthContext';
import { getJobCandidates } from '../api/candidates';
import { getJobs } from '../api/jobs';
import { createActivity, updateActivity } from '../api/activities';
import { getUsers } from '../api/users';
import { getScorecardTemplates } from '../api/scorecards';
import CustomSelect from './CustomSelect';
import MultiSelect from './MultiSelect';

const ACTIVITY_TYPES = [
    { value: 'Task', label: 'Task' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Interview', label: 'Interview' },
    { value: 'Call', label: 'Call' },
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
        end_time: '',
        location: '',
        participants: '',
        description: '',
        status: 'Pending',
        assignee_ids: [],
        scorecard_template_id: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);
    const [scorecardTemplates, setScorecardTemplates] = useState([]);

    const [availabilityChecking, setAvailabilityChecking] = useState(false);
    const [availabilityResult, setAvailabilityResult] = useState(null); // { status: "success"|"conflict"|"error", matchInfo: [] }

    // Slot picker state
    const [slotPickerOpen, setSlotPickerOpen] = useState(false);
    const [manualTimeEntry, setManualTimeEntry] = useState(false);
    const [selectedSlotLabel, setSelectedSlotLabel] = useState('');

    // Pre-fill form when editing
    useEffect(() => {
        if (activity) {
            setFormData({
                activity_type: activity.activity_type || initialType,
                title: activity.title || activity.activity_type || '',
                candidate_id: activity.candidate_id || candidateId || '',
                job_id: activity.job_id || jobId || '',
                scheduled_at: toDatetimeLocal(activity.scheduled_at),
                end_time: toDatetimeLocal(activity.end_time),
                location: activity.location || '',
                participants: activity.participants || '',
                description: activity.description || '',
                status: activity.status || 'Pending',
                assignee_ids: activity.assignees?.map(a => a.id) || [],
                scorecard_template_id: activity.scorecard_template_id || '',
            });

            if (activity.scheduled_at && activity.end_time) {
                const sDate = new Date(activity.scheduled_at);
                const eDate = new Date(activity.end_time);

                const formatTime = (d) =>
                    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
                const formatDate = (d) =>
                    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
                setSelectedSlotLabel(`${formatDate(sDate)} · ${formatTime(sDate)}–${formatTime(eDate)}`);
            } else {
                setSelectedSlotLabel('');
            }
        } else {
            setFormData({
                activity_type: initialType,
                title: '',
                candidate_id: candidateId || '',
                job_id: jobId || '',
                scheduled_at: '',
                end_time: '',
                location: '',
                participants: '',
                description: '',
                status: 'Pending',
                assignee_ids: [],
                scorecard_template_id: '',
            });
            setSelectedSlotLabel('');
            setManualTimeEntry(false);
        }
    }, [activity, isOpen, jobId, candidateId, initialType]);

    // Fetch related data on open
    useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            try {
                // Always fetch jobs list (we need it when no jobId context)
                const jobsList = await getJobs();
                setJobs(jobsList || []);

                // Fetch candidates if we have a concrete job context
                const effectiveJobId = jobId || (activity?.job_id) || formData.job_id;
                if (effectiveJobId) {
                    const cands = await getJobCandidates(effectiveJobId);
                    setCandidates(cands || []);
                }

                const [usersList, templatesList] = await Promise.all([
                    getUsers(),
                    getScorecardTemplates(),
                ]);
                setUsers(usersList || []);
                setScorecardTemplates(templatesList || []);
            } catch (err) {
                console.error('Failed to fetch modal data:', err);
            }
        };
        fetchData();
    }, [isOpen, jobId]);

    // Re-fetch candidates whenever the selected job changes
    useEffect(() => {
        if (!formData.job_id) {
            setCandidates([]);
            return;
        }
        const fetchCandidates = async () => {
            try {
                const cands = await getJobCandidates(formData.job_id);
                setCandidates(cands || []);
            } catch (err) {
                console.error('Failed to fetch candidates:', err);
            }
        };
        fetchCandidates();
    }, [formData.job_id]);

    const checkAvailability = async () => {
        if (!formData.scheduled_at || !formData.end_time || !formData.assignee_ids.length) {
            setAvailabilityResult({ status: 'error', message: 'Please select start time, end time, and at least one interviewer.' });
            return;
        }
        setAvailabilityChecking(true);
        setAvailabilityResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/calendar/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_ids: formData.assignee_ids,
                    timeMin: new Date(formData.scheduled_at).toISOString(),
                    timeMax: new Date(formData.end_time).toISOString(),
                })
            });

            if (!res.ok) throw new Error('Failed to fetch availability');
            const data = await res.json();

            let conflictInfo = [];

            // data is { "uuid": [ {start, end} ], ... }
            for (const uid of formData.assignee_ids) {
                const userObj = users.find(u => u.id === uid);
                const userName = userObj ? (userObj.full_name || userObj.email) : uid;

                const slots = data[uid];
                if (slots === null || slots === undefined) {
                    // Null means backend couldn't check (e.g. no Google token)
                    conflictInfo.push({ name: userName, status: 'unconnected' });
                } else if (slots.length === 0) {
                    conflictInfo.push({ name: userName, status: 'free' });
                } else {
                    conflictInfo.push({ name: userName, status: 'busy' });
                }
            }

            const hasConflict = conflictInfo.some(i => i.status === 'busy');
            const hasUnconnected = conflictInfo.some(i => i.status === 'unconnected');

            let finalStatus = 'success';
            let finalMessage = 'All selected participants are available';

            if (hasConflict) {
                finalStatus = 'conflict';
                finalMessage = 'Scheduling conflict detected';
            } else if (hasUnconnected) {
                finalStatus = 'unconnected';
                finalMessage = 'Could not verify all participants';
            }

            setAvailabilityResult({
                status: finalStatus,
                message: finalMessage,
                info: conflictInfo
            });

        } catch (err) {
            console.error('Availability check failed:', err);
            setAvailabilityResult({ status: 'error', message: 'Could not check availability.' });
        } finally {
            setAvailabilityChecking(false);
        }
    };

    // Called when user picks a slot from SlotPickerModal
    const handleSlotSelect = ({ start, end }) => {
        // Convert ISO to datetime-local format
        const toLocal = (iso) => {
            const d = new Date(iso);
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        setFormData(prev => ({ ...prev, scheduled_at: toLocal(start), end_time: toLocal(end) }));
        // Build a nice human label
        const dateStr = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const fmt = (iso) => {
            const d = new Date(iso);
            let h = d.getHours();
            const m = d.getMinutes();
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
        };
        setSelectedSlotLabel(`${dateStr} · ${fmt(start)} – ${fmt(end)}`);
        setAvailabilityResult(null); // clear old check
        setManualTimeEntry(false);
    };

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
                scorecard_template_id: formData.scorecard_template_id || null,
                scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
                end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
                participants: formData.participants && typeof formData.participants === 'string'
                    ? formData.participants.split(',').map(p => p.trim()).filter(p => p)
                    : (Array.isArray(formData.participants) ? formData.participants : []),
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
                    {/* SlotPickerModal renders over this modal */}
                    <SlotPickerModal
                        isOpen={slotPickerOpen}
                        onClose={() => setSlotPickerOpen(false)}
                        onSelect={handleSlotSelect}
                        assigneeIds={formData.assignee_ids}
                        initialDate={formData.scheduled_at ? formData.scheduled_at.split('T')[0] : new Date().toISOString().split('T')[0]}
                        initialDurationMinutes={formData.scheduled_at && formData.end_time ? Math.round((new Date(formData.end_time) - new Date(formData.scheduled_at)) / 60000) : 45}
                    />
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

                        <form onSubmit={handleSubmit} className="space-y-5">
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

                            {/* Context Selection — always show Job; show Candidate when we have a job context */}
                            {jobId ? (
                                // Opened from a Job page — job is fixed, only pick candidate
                                <>
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
                                        className=""
                                        disabled={isRestricted}
                                    />
                                </>
                            ) : (
                                // Opened from Activities page — show Job picker, then Candidate picker
                                <>
                                    <CustomSelect
                                        label={
                                            <span className="flex items-center">
                                                <Briefcase className="h-4 w-4 mr-2" />
                                                Related Job
                                            </span>
                                        }
                                        name="job_id"
                                        value={formData.job_id}
                                        onChange={(e) => {
                                            handleChange(e);
                                            // Reset candidate when job changes
                                            setFormData(prev => ({ ...prev, candidate_id: '' }));
                                        }}
                                        required={!jobId}
                                        options={[
                                            { value: '', label: '-- Select Job --' },
                                            ...jobs.map(j => ({ value: j.id, label: j.title }))
                                        ]}
                                        className=""
                                        disabled={isRestricted}
                                    />
                                    {/* Show candidate picker once a job is selected */}
                                    {formData.job_id && (
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
                                            className=""
                                            disabled={isRestricted}
                                        />
                                    )}
                                </>
                            )}

                            {/* Assignees (RESTRICTED) – before Date & Time so assignees are known when checking slots */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Users className="h-4 w-4 mr-2" />
                                        Assign Interviewers
                                    </label>

                                    {/* Check Availability – only shown in manual entry mode */}
                                    {manualTimeEntry && (
                                        <button
                                            type="button"
                                            onClick={checkAvailability}
                                            disabled={availabilityChecking || isRestricted || !formData.assignee_ids.length || !formData.scheduled_at || !formData.end_time}
                                            title={(!formData.assignee_ids.length || !formData.scheduled_at || !formData.end_time) ? "Please select Interviewers, Start Time, and End Time first" : "Check Google Calendar availability"}
                                            className={`text-xs font-semibold flex items-center gap-1 transition-colors ${(!formData.assignee_ids.length || !formData.scheduled_at || !formData.end_time) ? 'text-gray-400 cursor-not-allowed' : 'text-[#00C853] hover:text-green-700 disabled:opacity-50'}`}
                                        >
                                            {availabilityChecking ? (
                                                <span className="flex items-center gap-1 text-[#00C853]">
                                                    <div className="w-3 h-3 border-2 border-green-500 border-t-white rounded-full animate-spin"></div>
                                                    Checking...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Check Availability
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <MultiSelect
                                    name="assignee_ids"
                                    value={formData.assignee_ids}
                                    onChange={handleChange}
                                    options={users.map(u => ({ value: u.id, label: u.full_name || u.email }))}
                                    placeholder="Select Interviewers..."
                                    className="mb-0"
                                    disabled={isRestricted}
                                />

                                {/* Availability Results (manual mode only) */}
                                {availabilityResult && (
                                    <div className="mt-2 text-xs">
                                        {availabilityResult.status === 'success' ? (
                                            <div className="flex items-center gap-1 text-green-700 font-medium">
                                                <Check className="w-4 h-4" /> All selected participants are available
                                            </div>
                                        ) : availabilityResult.status === 'conflict' ? (
                                            <div>
                                                <div className="flex items-center gap-1 text-red-600 font-medium mb-1.5">
                                                    <X className="w-4 h-4" /> Scheduling conflict detected
                                                </div>
                                                <div className="bg-red-50/50 border border-red-100 rounded-md p-2 flex flex-col gap-1.5">
                                                    {availabilityResult.info.map((i, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-gray-700">
                                                            <span className="font-medium">{i.name}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${i.status === 'busy' ? 'bg-red-100 text-red-700' : (i.status === 'unconnected' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}`}>
                                                                {i.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : availabilityResult.status === 'unconnected' ? (
                                            <div>
                                                <div className="flex items-center gap-1 text-orange-600 font-medium mb-1.5">
                                                    <AlertTriangle className="w-4 h-4" /> Could not verify all participants
                                                </div>
                                                <div className="bg-orange-50 border border-orange-100 rounded-md p-2 flex flex-col gap-1.5">
                                                    {availabilityResult.info.map((i, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-gray-700">
                                                            <span className="font-medium">{i.name}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${i.status === 'unconnected' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                                {i.status === 'unconnected' ? 'Unlinked' : i.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-red-500">{availabilityResult.message}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Date & Time Section ── */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1">
                                    <Clock className="h-4 w-4" />
                                    Date &amp; Time
                                </label>
                                <div className="space-y-3">

                                    {/* Unified Summary Badge */}
                                    {selectedSlotLabel && !manualTimeEntry ? (
                                        <div className="flex items-center justify-between bg-[#00C853]/5 border border-[#00C853]/20 rounded-xl px-4 py-3">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 flex items-center justify-center shrink-0">
                                                    <CalendarDays className="w-4 h-4 text-[#00C853]" />
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-gray-900 leading-none mb-1">{selectedSlotLabel}</div>
                                                    <div className="text-[11px] font-semibold tracking-wide uppercase text-[#00C853]/80">Time slot scheduled</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSlotPickerOpen(true)}
                                                className="text-xs font-semibold text-[#00C853] hover:bg-[#00C853]/10 px-3 py-1.5 rounded-lg border border-[#00C853]/20 transition-all"
                                            >Reschedule</button>
                                        </div>
                                    ) : !manualTimeEntry ? (
                                        <button
                                            type="button"
                                            onClick={() => setSlotPickerOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gray-50 border border-dashed border-gray-300 text-gray-500 hover:bg-green-50/50 hover:border-green-300 hover:text-green-700 transition-all group"
                                        >
                                            <CalendarDays className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                                            Select a Time Slot
                                        </button>
                                    ) : null}

                                    {/* Manual toggle */}
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setManualTimeEntry(v => !v);
                                                setAvailabilityResult(null);
                                            }}
                                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Pencil className="w-3 h-3" />
                                            {manualTimeEntry ? 'Use slot picker' : 'Enter times manually'}
                                        </button>
                                    </div>

                                    {/* Manual datetime inputs */}
                                    {manualTimeEntry && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                                                <input
                                                    type="datetime-local"
                                                    name="scheduled_at"
                                                    value={formData.scheduled_at}
                                                    onChange={handleChange}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">End Time</label>
                                                <input
                                                    type="datetime-local"
                                                    name="end_time"
                                                    value={formData.end_time}
                                                    onChange={handleChange}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
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

                            {/* Scorecard Template */}
                            <div>
                                <CustomSelect
                                    label={
                                        <span className="flex items-center">
                                            <ClipboardList className="h-4 w-4 mr-2" />
                                            Scorecard Template
                                        </span>
                                    }
                                    name="scorecard_template_id"
                                    value={formData.scorecard_template_id}
                                    onChange={handleChange}
                                    options={[
                                        { value: '', label: '-- None (use default) --' },
                                        ...scorecardTemplates.map(t => ({ value: t.id, label: t.name }))
                                    ]}
                                    className="mb-0"
                                    disabled={isRestricted}
                                />
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
