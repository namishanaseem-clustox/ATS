import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRequisitions } from '../api/requisitions';
import { getCandidates } from '../api/candidates';
import { getMyInterviews } from '../api/activities';
import { CheckCircle, Users, Activity, ChevronRight, Inbox, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TaskInboxWidget = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isInterviewer = user?.role === 'interviewer';
    const canViewReqsAndCandidates = !isInterviewer;

    // Fetch data for the inbox
    const { data: requisitions = [], isLoading: loadingReqs } = useQuery({
        queryKey: ['requisitions'],
        queryFn: getRequisitions,
        enabled: canViewReqsAndCandidates
    });

    const { data: candidates = [], isLoading: loadingCands } = useQuery({
        queryKey: ['candidates'],
        queryFn: getCandidates,
        enabled: canViewReqsAndCandidates
    });

    const { data: activities = [], isLoading: loadingActs } = useQuery({
        queryKey: ['my-interviews'],
        queryFn: getMyInterviews
    });

    if ((loadingReqs && canViewReqsAndCandidates) || (loadingCands && canViewReqsAndCandidates) || loadingActs) {
        return <div className="animate-pulse h-64 bg-gray-100 rounded-xl"></div>;
    }

    // Process tasks
    const pendingReqs = requisitions.filter(r => r.status === 'Pending').slice(0, 3);
    const newCandidates = candidates.filter(c => {
        // Find if they have any 'Applied' applications
        return c.applications?.some(a => a.application_status === 'Applied');
    }).slice(0, 3);

    // Find activities in the past that are pending (need scorecards/completion)
    const now = new Date();
    const needsScorecard = activities.filter(a =>
        a.status === 'Pending' &&
        new Date(a.scheduled_at) < now &&
        a.candidate_id
    ).slice(0, 3);

    const totalTasks = pendingReqs.length + newCandidates.length + needsScorecard.length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-0 flex flex-col h-full max-h-[500px]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Inbox size={18} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">TASK INBOX</h3>
                </div>
                {totalTasks > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                        {totalTasks} Pending
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {totalTasks === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} className="text-[#00C853]" />
                        </div>
                        <h4 className="text-gray-900 font-bold mb-1">You're all caught up!</h4>
                        <p className="text-sm text-gray-500">Inbox Zero achieved. Great job.</p>
                    </div>
                ) : (
                    <div className="space-y-1">

                        {/* Scorecards Needed */}
                        {needsScorecard.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase px-3 py-2 flex items-center gap-2">
                                    <FileText size={14} /> Missing Scorecards
                                </h4>
                                {needsScorecard.map(act => (
                                    <div
                                        key={`act-${act.id}`}
                                        onClick={() => navigate(`/candidates/${act.candidate_id}?tab=activities`)}
                                        className="flex items-center p-3 mx-2 rounded-lg hover:bg-gray-50 cursor-pointer group border border-transparent hover:border-gray-200 transition-all"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-orange-500 mr-3 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">Submit feedback for {act.candidate?.first_name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Clock size={12} /> Interview was {new Date(act.scheduled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pending Requisitions */}
                        {pendingReqs.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase px-3 py-2 flex items-center gap-2">
                                    <CheckCircle size={14} /> Approvals Needed
                                </h4>
                                {pendingReqs.map(req => (
                                    <div
                                        key={`req-${req.id}`}
                                        onClick={() => navigate(`/requisitions/${req.id}`)}
                                        className="flex items-center p-3 mx-2 rounded-lg hover:bg-gray-50 cursor-pointer group border border-transparent hover:border-gray-200 transition-all"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 mr-3 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">Review {req.job_title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Requested by {req.requester?.full_name}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New Candidates */}
                        {newCandidates.length > 0 && (
                            <div className="mb-0">
                                <h4 className="text-xs font-bold text-gray-500 uppercase px-3 py-2 flex items-center gap-2">
                                    <Users size={14} /> New Applicants
                                </h4>
                                {newCandidates.map(cand => (
                                    <div
                                        key={`cand-${cand.id}`}
                                        onClick={() => navigate(`/candidates/${cand.id}`)}
                                        className="flex items-center p-3 mx-2 rounded-lg hover:bg-gray-50 cursor-pointer group border border-transparent hover:border-gray-200 transition-all"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">Review {cand.first_name} {cand.last_name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Applied for {cand.applications[0]?.job?.title}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskInboxWidget;
