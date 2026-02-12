import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, updatePipeline, cloneJob, deleteJob, updateJob, updateCandidateStage } from '../api/jobs';
import { getJobCandidates } from '../api/candidates';
import JobPipeline from '../components/JobPipeline';
import CandidateCard from '../components/CandidateCard';
import ActivityList from '../components/ActivityList';
import { Layout, GitPullRequest, Activity, Settings, Copy, Archive, Send, Users } from 'lucide-react';

const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const defaultPipeline = [
        { name: "New Candidates", id: "new" },
        { name: "Shortlisted", id: "shortlisted" },
        { name: "Technical Review", id: "technical_review" },
        { name: "Interview Round 1", id: "interview_round_1" },
        { name: "Interview Round 2", id: "interview_round_2" },
        { name: "Offer", id: "offer" },
        { name: "Hired", id: "hired" },
        { name: "Rejected", id: "rejected" }
    ];

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const data = await getJob(id);
                setJob(data);
            } catch (error) {
                console.error("Failed to fetch job", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'candidates' || activeTab === 'pipeline') {
            const fetchCandidates = async () => {
                try {
                    const data = await getJobCandidates(id);
                    setCandidates(data);
                } catch (error) {
                    console.error("Failed to fetch candidates", error);
                }
            };
            fetchCandidates();
        }
    }, [activeTab, id]);

    const handlePipelineUpdate = async (newConfig) => {
        try {
            await updatePipeline(id, newConfig);
            setJob(prev => ({ ...prev, pipeline_config: newConfig }));
        } catch (error) {
            console.error("Failed to update pipeline", error);
        }
    };

    const handleMoveCandidate = async (candidateId, newStage) => {
        console.log("Moving candidate:", candidateId, "to stage:", newStage);
        // Optimistic update
        setCandidates(prev => prev.map(app =>
            app.candidate.id === candidateId
                ? { ...app, current_stage: newStage }
                : app
        ));

        try {
            await updateCandidateStage(id, candidateId, newStage);
        } catch (error) {
            console.error("Failed to update candidate stage", error);
            // Revert on failure (could implement fetching again or undo logic)
        }
    };

    const handleClone = async () => {
        try {
            const newJob = await cloneJob(id);
            navigate(`/jobs/${newJob.id}`); // Navigate to new job
        } catch (error) {
            console.error("Failed to clone job", error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to archive "${job.title}"? This action can be reversed later.`)) {
            return;
        }
        try {
            await deleteJob(id);
            navigate('/jobs'); // Navigate back to jobs list
        } catch (error) {
            console.error("Failed to delete job", error);
            alert("Failed to archive job. Please try again.");
        }
    };

    const handleStatusToggle = async () => {
        const newStatus = job.status === 'Draft' ? 'Published' : 'Draft';
        const action = newStatus === 'Published' ? 'publish' : 'unpublish';

        if (!window.confirm(`Are you sure you want to ${action} "${job.title}"?`)) {
            return;
        }

        try {
            const updatedJob = await updateJob(id, { status: newStatus });
            setJob(updatedJob);
        } catch (error) {
            console.error("Failed to update job status", error);
            alert(`Failed to ${action} job. Please try again.`);
        }
    };

    const handleCandidateDelete = (candidateId) => {
        // Just remove from view for now, effectively "unlinking" or hiding would be better but
        // CandidateCard calls deleteCandidate which deletes the whole candidate.
        // Maybe we should warn the user that deleting from here deletes the candidate entirely?
        // For now, let's just refresh the list.
        setCandidates(prev => prev.filter(app => app.candidate.id !== candidateId));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading job details...</div>;
    if (!job) return <div className="p-8 text-center text-red-500">Job not found</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* Sidebar / Tabs */}
            <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 truncate" title={job.title}>
                        {job.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{job.job_code}</p>
                    <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800`}>
                        {job.status}
                    </span>
                </div>
                <nav className="p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'overview' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Layout size={18} className="mr-3" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('candidates')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'candidates' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Users size={18} className="mr-3" />
                        Candidates
                    </button>
                    <button
                        onClick={() => setActiveTab('pipeline')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'pipeline' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <GitPullRequest size={18} className="mr-3" />
                        Pipeline
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'activity' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Activity size={18} className="mr-3" />
                        Activity
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'settings' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Settings size={18} className="mr-3" />
                        Settings
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'overview' && (
                    <div className="p-8 max-w-4xl">
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Job Details</h3>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Internal Code</label>
                                    <p className="text-gray-900 mt-1">{job.job_code}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Employment Type</label>
                                    <p className="text-gray-900 mt-1">{job.employment_type}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Location</label>
                                    <p className="text-gray-900 mt-1">{job.location}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Headcount</label>
                                    <p className="text-gray-900 mt-1">{job.headcount}</p>
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-800 mb-2">Description</h4>
                            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                                {job.description}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Requirements</h3>
                            <p className="text-gray-600"><span className="font-medium">Experience:</span> {job.experience_range}</p>
                            <div className="mt-4">
                                <span className="font-medium text-gray-600">Skills:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {job.skills && job.skills.map(skill => (
                                        <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'candidates' && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Candidates</h3>
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">{candidates.length} Total</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {candidates.length > 0 ? (
                                candidates.map(app => (
                                    <CandidateCard
                                        key={app.id} // JobApplication ID
                                        candidate={{
                                            ...app.candidate,
                                            applications: [app] // Mock linking for card display
                                        }}
                                        onDelete={() => handleCandidateDelete(app.candidate.id)}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-white rounded-lg border border-gray-200">
                                    <p className="text-gray-500">No candidates applied to this job yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pipeline' && (
                    <div className="h-full p-4 overflow-hidden">
                        <JobPipeline
                            pipelineConfig={job.pipeline_config || defaultPipeline}
                            candidates={candidates}
                            onUpdatePipeline={handlePipelineUpdate}
                            onMoveCandidate={handleMoveCandidate}
                        />
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="p-8 space-y-8">
                        {/* New Scheduled Activities Section */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <ActivityList jobId={id} />
                        </div>

                        {/* Existing Audit Log */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Activity Log (Audit)</h3>
                            {job.activities && job.activities.length > 0 ? (
                                <ul className="space-y-4">
                                    {job.activities.map(activity => (
                                        <li key={activity.id} className="border-l-2 border-gray-200 pl-4 py-2">
                                            <p className="text-sm font-medium text-gray-900">
                                                {activity.action_type}
                                                <span className="text-gray-500 font-normal ml-2">
                                                    {new Date(activity.timestamp).toLocaleString()}
                                                </span>
                                            </p>
                                            <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                                                {JSON.stringify(activity.details, null, 2)}
                                            </pre>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No audit logs recorded.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="p-8">
                        <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Actions</h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg border-green-200 bg-green-50">
                                    <div>
                                        <h4 className="font-medium text-gray-900">
                                            {job.status === 'Draft' ? 'Publish Job' : 'Unpublish Job'}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {job.status === 'Draft'
                                                ? 'Make this job visible to candidates.'
                                                : 'Change job status back to Draft.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleStatusToggle}
                                        className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${job.status === 'Draft'
                                            ? 'bg-[#00C853] hover:bg-green-700'
                                            : 'bg-gray-600 hover:bg-gray-700'
                                            }`}
                                    >
                                        <Send size={16} className="mr-2" />
                                        {job.status === 'Draft' ? 'Publish' : 'Unpublish'}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg border-gray-200">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Clone Job</h4>
                                        <p className="text-sm text-gray-500">Create a copy of this job posting in Draft status.</p>
                                    </div>
                                    <button
                                        onClick={handleClone}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        <Copy size={16} className="mr-2" />
                                        Clone
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                                    <div>
                                        <h4 className="font-medium text-red-900">Archive Job</h4>
                                        <p className="text-sm text-red-500">Hide this job from the board. This action is reversible.</p>
                                    </div>
                                    <button
                                        onClick={handleDelete}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                    >
                                        <Archive size={16} className="mr-2" />
                                        Archive
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobDetail;
