import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { getJob, updatePipeline, cloneJob, deleteJob, updateJob, updateCandidateStage } from '../api/jobs';
import { getJobCandidates } from '../api/candidates';
import JobPipeline from '../components/JobPipeline';
import CandidateCard from '../components/CandidateCard';
import ActivityList from '../components/ActivityList';
import NoteList from '../components/NoteList';
import JobActivityLog from '../components/JobActivityLog';
import AIScreeningModal from '../components/AIScreeningModal';
import Breadcrumb from '../components/Breadcrumb';
import { Layout, GitPullRequest, Activity, Settings, Copy, Archive, Send, Users, StickyNote, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';

const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isAIScreeningModalOpen, setIsAIScreeningModalOpen] = useState(false);
    const [aiScreeningCandidate, setAiScreeningCandidate] = useState(null);
    const [showOverflow, setShowOverflow] = useState(false);
    const overflowRef = useRef(null);

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

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    useEffect(() => {
        // Redirect interviewers away from restricted tabs
        if (user?.role === 'interviewer' && (activeTab === 'candidates' || activeTab === 'pipeline' || activeTab === 'settings')) {
            setActiveTab('overview');
        }
    }, [activeTab, user?.role]);

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

    const handleAIScreenClick = (app) => {
        setAiScreeningCandidate(app);
        setIsAIScreeningModalOpen(true);
    };

    const handleAIScreeningComplete = (updatedApp) => {
        // Update the candidates list with the new AI score
        setCandidates(prev => prev.map(app =>
            app.id === updatedApp.id ? updatedApp : app
        ));
    };

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
        <div className="flex bg-gray-50 h-[calc(100vh-64px)] overflow-hidden">
            {/* Job sidebar / Tabs */}
            <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
                <div className="p-4 border-b border-gray-100">
                    {/* Archived Banner */}
                    {job.status === 'Archived' && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Archive className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        This job is currently <strong>archived</strong>. It is hidden from the main job board.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-start">
                        <div className="overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-800 truncate" title={job.title}>
                                {job.title}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">{job.job_code}</p>
                            {/* Connected UI: clickable department link */}
                            {job.department && (
                                <Link
                                    to={`/departments/${job.department.id}`}
                                    className="text-xs text-[#00C853] hover:underline mt-1 inline-block"
                                >
                                    {job.department.name}
                                </Link>
                            )}
                        </div>
                        {job.status === 'Draft' && (
                            <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                <button
                                    onClick={() => navigate(`/jobs/${id}/edit`)}
                                    className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Edit Job"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                            </RoleGuard>
                        )}
                    </div>
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
                    {user?.role !== 'interviewer' && (
                        <button
                            onClick={() => setActiveTab('candidates')}
                            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'candidates' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Users size={18} className="mr-3" />
                            Candidates
                        </button>
                    )}
                    {user?.role !== 'interviewer' && (
                        <button
                            onClick={() => setActiveTab('pipeline')}
                            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'pipeline' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <GitPullRequest size={18} className="mr-3" />
                            Pipeline
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'activity' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Activity size={18} className="mr-3" />
                        Activity
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'notes' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <StickyNote size={18} className="mr-3" />
                        Notes
                    </button>
                    {user?.role !== 'interviewer' && (
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'settings' ? 'bg-green-50 text-[#00C853]' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Settings size={18} className="mr-3" />
                            Settings
                        </button>
                    )}
                </nav>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col ${activeTab === 'pipeline' ? 'overflow-hidden' : 'overflow-auto'}`}>
                {activeTab === 'overview' && (
                    <div className="p-8 max-w-4xl">
                        {/* Breadcrumb for connected navigation */}
                        <Breadcrumb items={[
                            { label: 'Jobs', to: '/jobs' },
                            ...(job.department ? [{ label: job.department.name, to: `/departments/${job.department.id}` }] : []),
                            { label: job.title }
                        ]} />
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
                                // Sort candidates by AI score (highest first), then by name
                                [...candidates]
                                    .sort((a, b) => {
                                        // If both have AI scores, sort by score (descending)
                                        if (a.ai_score && b.ai_score) {
                                            return b.ai_score - a.ai_score;
                                        }
                                        // If only one has a score, prioritize it
                                        if (a.ai_score) return -1;
                                        if (b.ai_score) return 1;
                                        // Otherwise, sort alphabetically by name
                                        const nameA = `${a.candidate.first_name} ${a.candidate.last_name}`;
                                        const nameB = `${b.candidate.first_name} ${b.candidate.last_name}`;
                                        return nameA.localeCompare(nameB);
                                    })
                                    .map(app => (
                                        <CandidateCard
                                            key={app.id} // JobApplication ID
                                            candidate={{
                                                ...app.candidate,
                                                applications: [app] // Mock linking for card display
                                            }}
                                            onDelete={() => handleCandidateDelete(app.candidate.id)}
                                            onAIScreen={['hr', 'owner', 'hiring_manager'].includes(user?.role) ? () => handleAIScreenClick(app) : undefined}
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
                    <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
                        <JobPipeline
                            pipelineConfig={job.pipeline_config || defaultPipeline}
                            candidates={candidates}
                            onUpdatePipeline={handlePipelineUpdate}
                            onMoveCandidate={handleMoveCandidate}
                        />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="p-8">
                        <NoteList jobId={id} />
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
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Activity Log (Audit)</h3>
                            <JobActivityLog activities={job.activities} />
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="p-8">
                        <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Job Settings</h3>
                            <p className="text-sm text-gray-500 mb-6">Manage the status and visibility of this job posting.</p>

                            {/* PRIMARY action: Publish/Unpublish */}
                            <div className="flex items-center justify-between p-4 border rounded-lg border-green-200 bg-green-50 mb-4">
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
                                <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
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
                                </RoleGuard>
                            </div>

                            {/* SECONDARY actions: overflow menu */}
                            <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                <div className="relative" ref={overflowRef}>
                                    <button
                                        onClick={() => setShowOverflow(o => !o)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <MoreHorizontal size={16} />
                                        More actions
                                    </button>
                                    {showOverflow && (
                                        <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                                            <button
                                                onClick={() => { setShowOverflow(false); handleClone(); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <Copy size={15} className="text-gray-400" />
                                                Clone this job
                                            </button>
                                            <RoleGuard allowedRoles={['hr', 'owner']}>
                                                <div className="border-t border-gray-100 my-1" />
                                                <button
                                                    onClick={() => { setShowOverflow(false); handleDelete(); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Archive size={15} className="text-red-400" />
                                                    Archive job
                                                </button>
                                            </RoleGuard>
                                        </div>
                                    )}
                                </div>
                            </RoleGuard>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Screening Modal */}
            <AIScreeningModal
                isOpen={isAIScreeningModalOpen}
                onClose={() => setIsAIScreeningModalOpen(false)}
                jobId={id}
                candidateId={aiScreeningCandidate?.candidate?.id}
                candidateName={aiScreeningCandidate ? `${aiScreeningCandidate.candidate.first_name} ${aiScreeningCandidate.candidate.last_name}` : ''}
                initialData={aiScreeningCandidate?.ai_analysis}
                onScreeningComplete={handleAIScreeningComplete}
            />
        </div>
    );
};

export default JobDetail;
