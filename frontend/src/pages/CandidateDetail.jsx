import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidate, unlinkJobApplication } from '../api/candidates';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Linkedin, FileText, Trash2 } from 'lucide-react';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import ActivityList from '../components/ActivityList';
import NoteList from '../components/NoteList';
import CandidateScorecards from '../components/CandidateScorecards';
import Breadcrumb from '../components/Breadcrumb';
import CandidateModal from '../components/CandidateModal';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';

const CandidateDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { user } = useAuth();

    const fetchCandidate = async () => {
        try {
            const data = await getCandidate(id);
            setCandidate(data);
        } catch (error) {
            console.error("Failed to fetch candidate", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidate();
    }, [id]);

    const handleUnlinkJob = async (jobId, jobTitle) => {
        if (!window.confirm(`Are you sure you want to remove the application for "${jobTitle}"? This will unlink the candidate from this job.`)) {
            return;
        }

        try {
            await unlinkJobApplication(id, jobId);
            // Refresh candidate data
            fetchCandidate();
        } catch (error) {
            console.error("Failed to unlink job", error);
            alert("Failed to remove application. Please try again.");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading candidate profile...</div>;
    if (!candidate) return <div className="p-8 text-center text-red-500">Candidate not found</div>;

    return (
        <div className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-screen">
            <Breadcrumb items={[
                { label: 'Candidates', to: '/candidates' },
                { label: `${candidate.first_name} ${candidate.last_name}` }
            ]} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center relative group">
                        <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#00C853] hover:bg-green-50 rounded-full transition-colors"
                                title="Edit Profile"
                            >
                                <FileText size={20} /> {/* Using FileText as generic edit icon or import Pencil */}
                            </button>
                        </RoleGuard>

                        <div className="h-24 w-24 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#166534] font-bold text-3xl mb-4">
                            {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-1">{candidate.first_name} {candidate.last_name}</h1>

                        <div className="w-full mt-6 space-y-3">
                            <div className="flex items-center text-gray-600">
                                <Mail size={16} className="mr-3 text-gray-400" />
                                <span className="text-sm truncate">{candidate.email}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                                <Phone size={16} className="mr-3 text-gray-400" />
                                <span className="text-sm truncate">{candidate.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                                <MapPin size={16} className="mr-3 text-gray-400" />
                                <span className="text-sm truncate">{candidate.location || 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                                <Briefcase size={16} className="mr-3 text-gray-400" />
                                <span className="text-sm">{candidate.experience_years} years experience</span>
                            </div>
                            {candidate.social_links?.linkedin && (
                                <div className="flex items-center text-gray-600">
                                    <Linkedin size={16} className="mr-3 text-gray-400" />
                                    <a href={candidate.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">LinkedIn Profile</a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Applied Jobs Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 text-base">Applied Jobs</h3>
                        {candidate.applications && candidate.applications.length > 0 ? (
                            <div className="space-y-4">
                                {candidate.applications.map(app => (
                                    <div key={app.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{app.job ? app.job.title : "Unknown Job"}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ApplicationStatusBadge status={app.application_status} />
                                            <RoleGuard allowedRoles={['hr', 'owner']}>
                                                <button
                                                    onClick={() => handleUnlinkJob(app.job_id, app.job?.title)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove Application"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </RoleGuard>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No active applications</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
                        <div className="border-b border-gray-200 px-8 pt-2">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                                        ? 'border-[#00C853] text-[#00C853]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('resume')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'resume'
                                        ? 'border-[#00C853] text-[#00C853]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Resume
                                </button>
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'notes'
                                        ? 'border-[#00C853] text-[#00C853]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Notes
                                </button>
                                <button
                                    onClick={() => setActiveTab('activities')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'activities'
                                        ? 'border-[#00C853] text-[#00C853]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Activities
                                </button>
                            </nav>
                        </div>

                        <div className="p-8 flex-1">
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    {/* Resume Status Alert */}
                                    <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-[#1e40af] mb-1">Resume Status</h4>
                                        <p className="text-sm text-[#1e40af]">
                                            {candidate.resume_file_path ? "Resume parsed successfully" : "No resume uploaded"}
                                        </p>
                                    </div>

                                    {/* Skills Section */}
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 mb-4">Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.skills && candidate.skills.length > 0 ? (
                                                candidate.skills.map((skill, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-gray-400 italic text-sm">No skills parsed yet.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Experience Section */}
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 mb-4">Experience</h3>
                                        {candidate.experience_history && candidate.experience_history.length > 0 ? (
                                            <div className="space-y-6">
                                                {candidate.experience_history.map((exp, idx) => (
                                                    <div key={idx} className="relative pl-4 border-l-2 border-gray-200">
                                                        <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-gray-300"></div>
                                                        <h4 className="font-bold text-gray-900 text-sm">{exp.title}</h4>
                                                        <p className="text-[#16a34a] font-medium text-sm">{exp.company}</p>
                                                        <p className="text-xs text-gray-500 mb-2">{exp.dates}</p>
                                                        <p className="text-gray-600 text-sm leading-relaxed">{exp.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                <p className="text-gray-500 text-sm">No experience history available.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Education Section */}
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 mb-4">Education</h3>
                                        {candidate.education && candidate.education.length > 0 ? (
                                            <div className="space-y-4">
                                                {candidate.education.map((edu, idx) => (
                                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <h4 className="font-bold text-gray-900 text-sm">{edu.school}</h4>
                                                        <p className="text-gray-700 text-sm mt-1">{edu.degree}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{edu.year}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                <p className="text-gray-500 text-sm">No education history available.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Interview Feedback Section - Only visible to HR, Owner, and Hiring Managers */}
                                    <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 mb-4">Interview Feedback</h3>
                                            <CandidateScorecards candidateId={candidate.id} />
                                        </div>
                                    </RoleGuard>
                                </div>
                            )}

                            {activeTab === 'resume' && (
                                <div className="h-full min-h-[600px] bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                                    {candidate.resume_file_path ? (
                                        <iframe
                                            src={`http://localhost:8000/static/${candidate.resume_file_path.split('/').pop()}`}
                                            className="w-full h-full absolute inset-0"
                                            title="Resume Preview"
                                        >
                                            <p className="p-4 text-center">Your browser does not support PDFs.
                                                <a href={`http://localhost:8000/static/${candidate.resume_file_path.split('/').pop()}`} className="text-blue-600 hover:underline ml-1">Download the PDF</a>.</p>
                                        </iframe>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                                            <FileText size={48} className="mb-4 text-gray-300" />
                                            <p>No resume file attached.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="p-8">
                                    <NoteList candidateId={id} />
                                </div>
                            )}
                            {activeTab === 'activities' && (
                                <div className="p-8">
                                    <ActivityList candidateId={id} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CandidateModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                candidate={candidate}
                onSave={fetchCandidate}
            />
        </div>
    );
};

export default CandidateDetail;
