import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidate } from '../api/candidates';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Linkedin, ArrowLeft, FileText } from 'lucide-react';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';

const CandidateDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchCandidate = async () => {
            try {
                const data = await getCandidate(id);
                console.log("Candidate Data Received:", data);
                setCandidate(data);
            } catch (error) {
                console.error("Failed to fetch candidate", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCandidate();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading candidate profile...</div>;
    if (!candidate) return <div className="p-8 text-center text-red-500">Candidate not found</div>;

    return (
        <div className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-screen">
            <button onClick={() => navigate('/candidates')} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft size={18} className="mr-2" /> Back to Candidates
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
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
                                <Briefcase size={16} className="mr-3 text-gray-400" />
                                <span className="text-sm">{candidate.experience_years} years experience</span>
                            </div>
                        </div>
                    </div>

                    {/* Applied Jobs Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 text-base">Applied Jobs</h3>
                        {candidate.applications && candidate.applications.length > 0 ? (
                            <div className="space-y-4">
                                {candidate.applications.map(app => (
                                    <div key={app.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{app.job ? app.job.title : "Unknown Job"}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                                        </div>
                                        <ApplicationStatusBadge status={app.application_status} />
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
                            </nav>
                        </div>

                        <div className="p-8 flex-1">
                            {activeTab === 'overview' ? (
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
                                </div>
                            ) : (
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateDetail;
