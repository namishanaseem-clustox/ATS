import React, { useState } from 'react';
import { User, Briefcase, MapPin, Trash2, Eye, Brain, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApplicationStatusBadge from './ApplicationStatusBadge';
import FeedbackViewModal from './FeedbackViewModal';
import { useAuth } from '../context/AuthContext';
import RoleGuard from './RoleGuard';

const CandidateCard = ({ candidate, onDelete, onAIScreen }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const {
        id, first_name, last_name, current_position, current_company,
        location, experience_years, applications
    } = candidate;

    // Show most recent application status if defined
    const latestApp = applications && applications.length > 0
        ? applications[applications.length - 1]
        : null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200 relative group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-[#00C853] font-bold text-lg mr-4">
                        {first_name[0]}{last_name[0]}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{first_name} {last_name}</h3>
                        <p className="text-sm text-gray-500">{current_position || 'Open to work'} {current_company && `at ${current_company}`}</p>
                    </div>
                </div>
                {latestApp && (
                    <div className="flex flex-col items-end gap-2">
                        <ApplicationStatusBadge status={latestApp.application_status} />
                        {latestApp.ai_score && (
                            <div className="flex items-center bg-purple-50 px-2 py-1 rounded" title="AI Match Score">
                                <Brain size={12} className="text-purple-600 mr-1" />
                                <span className="text-xs font-bold text-purple-700">{Math.round(latestApp.ai_score)}</span>
                            </div>
                        )}
                        {latestApp.job && <span className="text-xs text-gray-400 mt-1 max-w-[100px] truncate">{latestApp.job.title}</span>}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
                <div className="flex items-center">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    {location || 'Remote'}
                </div>
                <div className="flex items-center">
                    <Briefcase size={16} className="mr-2 text-gray-400" />
                    {experience_years} years exp.
                </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-between items-center gap-2 border-t pt-4 border-gray-50">
                {onAIScreen && latestApp && (
                    <button
                        onClick={() => onAIScreen(latestApp)}
                        className="flex items-center px-2 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="AI Screening Analysis"
                    >
                        <Brain size={16} className="mr-1" />
                        {latestApp.ai_score ? 'Analysis' : 'AI Screen'}
                    </button>
                )}
                <div className="flex gap-1 ml-auto">
                    <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                        <button
                            onClick={() => setIsFeedbackModalOpen(true)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View Interview Feedback"
                        >
                            <MessageSquare size={18} />
                        </button>
                    </RoleGuard>
                    <button
                        onClick={() => navigate(`/candidates/${id}`)}
                        className="p-1.5 text-[#00C853] hover:bg-green-50 rounded-md transition-colors"
                        title="View Profile"
                    >
                        <Eye size={18} />
                    </button>
                    <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                        <button
                            onClick={() => onDelete(id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Candidate"
                        >
                            <Trash2 size={18} />
                        </button>
                    </RoleGuard>
                </div>
            </div>

            {/* Feedback Modal */}
            <FeedbackViewModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                candidate={candidate}
            />
        </div>
    );
};

export default CandidateCard;
