import React, { useState } from 'react';
import { User, Briefcase, MapPin, Trash2, Eye, Brain, MessageSquare, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApplicationStatusBadge from './ApplicationStatusBadge';
import FeedbackViewModal from './FeedbackViewModal';
import { useAuth } from '../context/AuthContext';
import RoleGuard from './RoleGuard';

const CandidateRow = ({ candidate, onDelete, onAIScreen, visibleColumns, stageMap }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const {
        id, first_name, last_name, current_position, current_company,
        location, experience_years, applications
    } = candidate;

    // Show most recent application status if defined
    const latestApp = applications && applications.length > 0
        ? applications[applications.length - 1]
        : null;

    return (
        <>
            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-0 relative">
                {(visibleColumns?.includes('candidate') ?? true) && (
                    <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center text-[#00C853] font-bold text-xs mr-3">
                                {first_name[0]}{last_name[0]}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">{first_name} {last_name}</div>
                                <div className="text-xs text-gray-500">{current_position || 'Open to work'}</div>
                            </div>
                        </div>
                    </td>
                )}
                {(visibleColumns?.includes('status') ?? true) && (
                    <td className="px-6 py-3 whitespace-nowrap">
                        {latestApp ? (
                            <ApplicationStatusBadge status={latestApp.application_status} />
                        ) : (
                            <span className="text-xs text-gray-400">No Status</span>
                        )}
                    </td>
                )}
                {(visibleColumns?.includes('stage') ?? true) && (
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {latestApp ? (
                            (stageMap?.[latestApp.current_stage] || latestApp.current_stage || '-')
                        ) : (
                            <span className="text-xs text-gray-400">-</span>
                        )}
                    </td>
                )}
                {(visibleColumns?.includes('location') ?? true) && (
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-gray-400" />
                            {location || 'Remote'}
                        </div>
                    </td>
                )}
                {(visibleColumns?.includes('experience') ?? true) && (
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {experience_years} years
                    </td>
                )}
                {(visibleColumns?.includes('ai_score') ?? true) && (
                    <td className="px-6 py-3 whitespace-nowrap">
                        {latestApp?.ai_score ? (
                            <div className="flex items-center bg-purple-50 px-2 py-0.5 rounded w-fit" title="AI Match Score">
                                <Brain size={14} className="text-purple-600 mr-1.5" />
                                <span className="text-xs font-bold text-purple-700">{Math.round(latestApp.ai_score)}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-300">-</span>
                        )}
                    </td>
                )}
                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            ></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 ring-1 ring-black ring-opacity-5 py-1">
                                {onAIScreen && latestApp && (
                                    <button
                                        onClick={() => { onAIScreen(latestApp); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <Brain size={16} className="text-purple-600" />
                                        {latestApp.ai_score ? 'View Analysis' : 'Run AI Screen'}
                                    </button>
                                )}
                                <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                    <button
                                        onClick={() => { setIsFeedbackModalOpen(true); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <MessageSquare size={16} className="text-blue-600" />
                                        View Feedback
                                    </button>
                                </RoleGuard>
                                <button
                                    onClick={() => { navigate(`/candidates/${id}`); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <Eye size={16} className="text-[#00C853]" />
                                    View Profile
                                </button>
                                <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                    <button
                                        onClick={() => { onDelete(id); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete Candidate
                                    </button>
                                </RoleGuard>
                            </div>
                        </>
                    )}
                </td>
            </tr>
            <FeedbackViewModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                candidate={candidate}
                onSaved={() => { }}
            />
        </>
    );
};

export default CandidateRow;
