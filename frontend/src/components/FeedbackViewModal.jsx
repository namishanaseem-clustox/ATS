import React, { useState, useEffect } from 'react';
import { X, Star, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { getCandidateFeedbacks } from '../api/feedbacks';
import { useAuth } from '../context/AuthContext';

import { useNavigate } from 'react-router-dom';

const FeedbackViewModal = ({ isOpen, onClose, candidate }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && candidate?.id) {
            fetchFeedbacks();
        }
    }, [isOpen, candidate?.id]);

    const fetchFeedbacks = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getCandidateFeedbacks(candidate.id);
            setFeedbacks(data);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
            setError('Failed to load feedback data');
        } finally {
            setLoading(false);
        }
    };

    const getRecommendationColor = (recommendation) => {
        if (recommendation?.toLowerCase().includes('strong yes')) return 'bg-green-100 text-green-800 border-green-200';
        if (recommendation?.toLowerCase().includes('yes')) return 'bg-green-50 text-green-700 border-green-200';
        if (recommendation?.toLowerCase().includes('strong no')) return 'bg-red-100 text-red-800 border-red-200';
        if (recommendation?.toLowerCase().includes('no')) return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-gray-50 text-gray-700 border-gray-200';
    };

    const renderStars = (score) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={16}
                className={i < score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            />
        ));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full relative z-10">
                    <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl leading-6 font-bold text-gray-900 border-b-2 border-blue-500 inline-block pb-1">
                                    Interview Feedback History
                                </h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    All evaluations for <span className="font-semibold text-gray-700">{candidate?.first_name} {candidate?.last_name}</span>
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start gap-3 border border-red-100">
                                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : feedbacks.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No interview feedback available for this candidate</p>
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-96 overflow-y-auto">
                                {feedbacks.map((feedback) => (
                                    <div key={feedback.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                                    {feedback.interviewer?.first_name?.[0] || feedback.interviewer?.email?.[0]?.toUpperCase()}{feedback.interviewer?.last_name?.[0] || ''}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {feedback.interviewer?.first_name && feedback.interviewer?.last_name
                                                            ? `${feedback.interviewer.first_name} ${feedback.interviewer.last_name}`
                                                            : feedback.interviewer?.email || 'Unknown Interviewer'
                                                        }
                                                    </p>
                                                    <p className="text-sm text-gray-500">{feedback.interviewer?.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getRecommendationColor(feedback.recommendation)}`}>
                                                    {feedback.recommendation}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2 flex items-center">
                                                    <Calendar size={12} className="mr-1" />
                                                    {new Date(feedback.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Overall Score */}
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700">Overall Score:</span>
                                                <div className="flex items-center gap-1">
                                                    {renderStars(feedback.overall_score)}
                                                    <span className="text-sm font-bold text-gray-900 ml-2">({feedback.overall_score}/5)</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activity Info */}
                                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Interview Activity:</p>
                                            <p className="text-sm text-gray-600">{feedback.activity?.title}</p>
                                        </div>

                                        {/* Scorecard */}
                                        {feedback.scorecard && feedback.scorecard.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-sm font-medium text-gray-700 mb-3">Detailed Scorecard:</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {feedback.scorecard.map((item, index) => (
                                                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-sm font-medium text-gray-900">{item.criteria}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {renderStars(item.score)}
                                                                    <span className="text-xs font-bold text-gray-700 ml-1">({item.score})</span>
                                                                </div>
                                                            </div>
                                                            {item.comment && (
                                                                <p className="text-xs text-gray-600 italic">"{item.comment}"</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Comments */}
                                        {feedback.comments && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">Final Comments:</p>
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.comments}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Investment Loop - Next Action Prompt */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <p className="text-sm text-gray-600 italic">
                            Done reviewing? Keep the momentum going.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate(`/candidates/${candidate.id}?tab=activities`);
                                }}
                                className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md text-sm font-medium transition-colors"
                            >
                                Schedule Next Interview
                            </button>
                            <button
                                onClick={() => {
                                    onClose();
                                    // Try to find the job ID from applications
                                    const jobId = candidate.applications?.[0]?.job_id || candidate.applications?.[0]?.job?.id;
                                    if (jobId) {
                                        navigate(`/jobs/${jobId}?tab=pipeline`);
                                    } else {
                                        navigate('/jobs');
                                    }
                                }}
                                className="px-4 py-2 bg-[#00C853] hover:bg-green-600 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
                            >
                                Move to Next Stage
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackViewModal;
