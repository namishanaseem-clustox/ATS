import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequisition, submitRequisition, approveRequisition, rejectRequisition, convertRequisitionToJob } from '../../api/requisitions';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, FileText, Send, User, ChevronLeft } from 'lucide-react';

const RequisitionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: req, isLoading, isError } = useQuery({
        queryKey: ['requisitions', id],
        queryFn: () => getRequisition(id),
    });

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const invalidateQuery = () => queryClient.invalidateQueries({ queryKey: ['requisitions', id] });

    const submitReq = useMutation({ mutationFn: submitRequisition, onSuccess: invalidateQuery });
    const approveReq = useMutation({ mutationFn: approveRequisition, onSuccess: invalidateQuery });
    const rejectReq = useMutation({
        mutationFn: ({ id, reason }) => rejectRequisition(id, reason),
        onSuccess: invalidateQuery
    });
    const convertReq = useMutation({
        mutationFn: convertRequisitionToJob,
        onSuccess: (data) => {
            navigate(`/jobs/${data.job_id}/edit`);
        }
    });

    const isHiringManager = user?.role === 'hiring_manager';
    const isHrOrOwner = ['owner', 'hr'].includes(user?.role);

    const submitRejection = () => {
        if (!rejectReason.trim()) return;
        rejectReq.mutate({ id: req.id, reason: rejectReason });
        setIsRejectModalOpen(false);
        setRejectReason('');
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    if (isError || !req) return <div className="p-8 text-red-500">Error loading requisition.</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6 relative">
            <button onClick={() => navigate('/requisitions')} className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2 w-max">
                <ChevronLeft size={16} className="mr-1" /> Back to Requisitions
            </button>

            {isRejectModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">Reject Requisition</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection *</label>
                            <textarea
                                className="w-full border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y"
                                placeholder="Provide feedback to the hiring manager explaining why this requisition cannot be approved..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsRejectModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRejection}
                                disabled={!rejectReason.trim() || rejectReq.isPending}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {rejectReq.isPending ? 'Rejecting...' : 'Reject Requisition'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{req.job_title}</h1>
                    <div className="mt-2 text-sm text-gray-500 flex items-center gap-4">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{req.req_code}</span>
                        <span>{req.department_name}</span>
                        <span>{req.location}</span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${req.status === 'Open' ? 'bg-green-100 text-green-800' :
                                req.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                    req.status === 'Filled' ? 'bg-purple-100 text-purple-800' :
                                        'bg-yellow-100 text-yellow-800'}`}>
                            {req.status}
                        </span>
                    </div>
                </div>

                {/* Workflow Actions */}
                <div className="flex gap-2">
                    {req.status === 'Draft' && isHiringManager && (
                        <>
                            <button onClick={() => navigate(`/requisitions/${req.id}/edit`)} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50">
                                Edit
                            </button>
                            <button onClick={() => submitReq.mutate(req.id)} className="flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded shadow hover:bg-green-600">
                                <Send size={16} /> Submit to HR
                            </button>
                        </>
                    )}

                    {isHrOrOwner && (req.status === 'Pending_HR' || req.status === 'Pending_Owner') && (
                        <>
                            <button onClick={() => setIsRejectModalOpen(true)} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50">
                                <XCircle size={16} /> Reject
                            </button>
                            <button onClick={() => approveReq.mutate(req.id)} className="flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded shadow hover:bg-green-600">
                                <CheckCircle size={16} /> Approve
                            </button>
                        </>
                    )}

                    {isHrOrOwner && req.status === 'Open' && (
                        <button onClick={() => convertReq.mutate(req.id)} className="flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded shadow hover:bg-green-600">
                            <FileText size={16} /> Create Job Posting
                        </button>
                    )}
                </div>
            </div>

            {req.status === 'Draft' && req.rejection_reason && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg shadow-sm flex items-start gap-3">
                    <XCircle className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Requisition Returned for Revision</h4>
                        <p className="text-sm">{req.rejection_reason}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Business Justification</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{req.justification || 'No justification provided.'}</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Compensation & Budget</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-gray-500 block">Salary Range</span>
                                <span className="font-medium">
                                    {req.min_salary ? `${req.currency} ${req.min_salary.toLocaleString()}` : 'TBD'} -
                                    {req.max_salary ? ` ${req.currency} ${req.max_salary.toLocaleString()}` : 'TBD'}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 block">Bonus / Equity</span>
                                <span className="font-medium">{req.has_equity_bonus ? 'Eligible' : 'Not Eligible'}</span>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 block">Budget Code / Cost Center</span>
                                <span className="font-medium">{req.budget_code || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-base font-semibold border-b pb-2 mb-4">Timeline & Audit</h3>
                        <div className="space-y-4">
                            {[...(req.audit_logs || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                                <div key={log.id} className="text-sm bg-white p-3 rounded border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 font-medium text-gray-900 mb-1">
                                        <div className="bg-gray-100 p-1 rounded-full">
                                            <User size={14} className="text-gray-500" />
                                        </div>
                                        {log.user?.full_name || 'System / Unknown User'}
                                    </div>
                                    <div className="text-gray-700 text-sm">{log.action}</div>
                                    <div className="text-xs text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequisitionDetail;
