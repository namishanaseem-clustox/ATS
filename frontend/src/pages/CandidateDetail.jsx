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
        <div className="max-w-7xl mx-auto p-8">
            <button onClick={() => navigate('/candidates')} className="flex items-center text-gray-500 hover:text-gray-900 mb-6">
                <ArrowLeft size={18} className="mr-2" /> Back to Candidates
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center text-[#00C853] font-bold text-3xl mb-4">
                                {candidate.first_name[0]}{candidate.last_name[0]}
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">{candidate.first_name} {candidate.last_name}</h1>
                            <p className="text-gray-500 mb-4">{candidate.current_position}</p>

                            <div className="w-full space-y-3 text-left">
                                <div className="flex items-center text-gray-600">
                                    <Mail size={18} className="mr-3 text-gray-400" />
                                    <span className="text-sm truncate">{candidate.email}</span>
                                </div>
                                {candidate.phone && (
                                    <div className="flex items-center text-gray-600">
                                        <Phone size={18} className="mr-3 text-gray-400" />
                                        <span className="text-sm">{candidate.phone}</span>
                                    </div>
                                )}
                                {candidate.location && (
                                    <div className="flex items-center text-gray-600">
                                        <MapPin size={18} className="mr-3 text-gray-400" />
                                        <span className="text-sm">{candidate.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center text-gray-600">
                                    <Briefcase size={18} className="mr-3 text-gray-400" />
                                    <span className="text-sm">{candidate.experience_years} years experience</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Applied Jobs</h3>
                        {candidate.applications && candidate.applications.length > 0 ? (
                            <div className="space-y-3">
                                {candidate.applications.map(app => (
                                    <div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{app.job ? app.job.title : "Unknown Job"}</p>
                                            <p className="text-xs text-gray-500">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
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

                {/* Right Column: Detailed Info */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px]">
                        <div className="border-b border-gray-200 px-6">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                        ? 'border-[#00C853] text-[#00C853]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('resume')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'resume'
                                        ? 'border-[#00C853] text-[#00C853]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Resume
                                </button>
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'overview' ? (
                                <div className="space-y-8">
                                    <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Resume Status</p>
                                            <p className="text-sm text-gray-600">
                                                {candidate.resume_file_path ? "Resume uploaded & parsed" : "No resume uploaded"}
                                            </p>
                                        </div>
                                        {candidate.resume_file_path && (
                                            <button
                                                onClick={() => setActiveTab('resume')}
                                                className="text-sm text-[#00C853] font-medium hover:underline"
                                            >
                                                View Source
                                            </button>
                                        )}
                                    </div>

                                    {/* Skills Section */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.skills && candidate.skills.length > 0 ? (
                                                candidate.skills.map((skill, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 italic text-sm">No skills parsed yet.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Experience Section */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">Experience</h3>
                                        {candidate.experience_history && candidate.experience_history.length > 0 ? (
                                            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                                {candidate.experience_history.map((exp, idx) => (
                                                    <div key={idx} className="mb-8 ml-6 relative">
                                                        <span className="absolute -left-[31px] top-1 bg-white border-2 border-gray-300 rounded-full w-4 h-4"></span>
                                                        <h4 className="font-bold text-gray-900">{exp.title}</h4>
                                                        <p className="text-green-600 font-medium">{exp.company}</p>
                                                        <p className="text-sm text-gray-500 mb-2">{exp.dates}</p>
                                                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{exp.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                                <p className="text-gray-500">No experience history available.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Education Section */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">Education</h3>
                                        {candidate.education && candidate.education.length > 0 ? (
                                            <ul className="space-y-4">
                                                {candidate.education.map((edu, idx) => (
                                                    <li key={idx} className="bg-gray-50 p-4 rounded-lg">
                                                        <h4 className="font-bold text-gray-900">{edu.school}</h4>
                                                        <p className="text-gray-700">{edu.degree}</p>
                                                        <p className="text-sm text-gray-500">{edu.year}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-center py-6 bg-gray-50 rounded-lg">
                                                <p className="text-gray-500">No education history available.</p>
                                            </div>
                                        )}
                                    </div>


                                </div>
                            ) : (
                                <div className="h-[800px] bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                                    {candidate.resume_file_path ? (
                                        <div className="h-full flex flex-col">
                                            <div className="bg-white border-b border-gray-200 p-2 flex justify-between items-center">
                                                <span className="text-sm text-gray-500 px-2">{candidate.resume_file_path.split('/').pop()}</span>
                                                <a
                                                    href={`http://localhost:8000/static/${candidate.resume_file_path.split('/').pop()}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#00C853] hover:underline px-2"
                                                >
                                                    Open in New Tab
                                                </a>
                                            </div>
                                            <iframe
                                                src={`http://localhost:8000/static/${candidate.resume_file_path.split('/').pop()}`}
                                                className="w-full h-full"
                                                title="Resume Preview"
                                            >
                                                <p>Your browser does not support PDFs.
                                                    <a href={`http://localhost:8000/static/${candidate.resume_file_path.split('/').pop()}`}>Download the PDF</a>.</p>
                                            </iframe>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
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
