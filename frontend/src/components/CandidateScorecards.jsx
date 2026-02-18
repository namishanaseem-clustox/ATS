
import React, { useState, useEffect } from 'react';
import { getCandidateFeedbacks } from '../api/feedbacks';
import { Star, MessageSquare, User, Calendar } from 'lucide-react';

const CandidateScorecards = ({ candidateId }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const data = await getCandidateFeedbacks(candidateId);
                setFeedbacks(data);
            } catch (error) {
                console.error("Failed to fetch feedbacks", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeedbacks();
    }, [candidateId]);

    if (loading) return <div className="text-center py-10 text-gray-500">Loading scorecards...</div>;

    if (feedbacks.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No scorecards submitted for this candidate yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {feedbacks.map((feedback) => (
                <div key={feedback.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold">
                                    {feedback.overall_score}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Overall Score: {feedback.overall_score}/5</h4>
                                    <p className={`text-sm font-semibold ${feedback.recommendation.includes('Yes') ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        Recommendation: {feedback.recommendation}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        by {feedback.interviewer?.first_name && feedback.interviewer?.last_name 
                                            ? `${feedback.interviewer.first_name} ${feedback.interviewer.last_name}`
                                            : feedback.interviewer?.email || 'Unknown Interviewer'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center text-xs text-gray-500 mb-1">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(feedback.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Scorecard Items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {feedback.scorecard?.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-50">
                                    <div>
                                        <p className="text-xs font-bold text-gray-700">{item.criteria}</p>
                                        {item.comment && <p className="text-[11px] text-gray-500 mt-0.5 italic">"{item.comment}"</p>}
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star
                                                key={s}
                                                className={`h-3 w-3 ${s <= item.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {feedback.comments && (
                            <div className="bg-green-50/30 p-4 rounded-lg border border-green-100/50">
                                <h5 className="text-xs font-bold text-green-800 mb-2 uppercase tracking-wider">Interviewer Summary</h5>
                                <p className="text-sm text-gray-700 leading-relaxed italic">"{feedback.comments}"</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CandidateScorecards;
