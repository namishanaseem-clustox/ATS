
import React, { useState } from 'react';
import { X, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createFeedback } from '../api/feedbacks';

const SCORECARD_CRITERIA = [
    "Technical Proficiency",
    "Communication Skills",
    "Problem Solving",
    "Culture Fit",
    "Relevant Experience"
];

const ScorecardModal = ({ isOpen, onClose, activity, onSave }) => {
    const [overallScore, setOverallScore] = useState(0);
    const [recommendation, setRecommendation] = useState('');
    const [scorecard, setScorecard] = useState(
        SCORECARD_CRITERIA.map(c => ({ criteria: c, score: 0, comment: '' }))
    );
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleScoreChange = (index, score) => {
        const newScorecard = [...scorecard];
        newScorecard[index].score = score;
        setScorecard(newScorecard);
    };

    const handleCommentChange = (index, comment) => {
        const newScorecard = [...scorecard];
        newScorecard[index].comment = comment;
        setScorecard(newScorecard);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (overallScore === 0) {
            setError("Please provide an overall score");
            return;
        }
        if (!recommendation) {
            setError("Please provide a recommendation");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const payload = {
                activity_id: activity.id,
                candidate_id: activity.candidate_id,
                overall_score: overallScore,
                recommendation,
                scorecard,
                comments
            };

            await createFeedback(payload);
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to submit feedback", error);
            setError(error.response?.data?.detail || "Failed to submit feedback");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
                    <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl leading-6 font-bold text-gray-900 border-b-2 border-green-500 inline-block pb-1">
                                    Interview Scorecard
                                </h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    Feedback for <span className="font-semibold text-gray-700">{activity.candidate?.first_name} {activity.candidate?.last_name}</span>
                                    - {activity.title}
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Scorecard Sections */}
                            <div className="space-y-6">
                                {scorecard.map((item, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-bold text-gray-800">{item.criteria}</h4>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => handleScoreChange(index, s)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${item.score === s
                                                                ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                                                : 'bg-white text-gray-400 border hover:border-green-300 hover:text-green-500'
                                                            }`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Specific comments for this criteria..."
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                                            value={item.comment}
                                            onChange={(e) => handleCommentChange(index, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <hr className="border-gray-100" />

                            {/* Overall Sentiment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        Overall Candidate Score
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setOverallScore(s)}
                                                className={`flex-1 h-12 rounded-xl flex items-center justify-center text-lg font-black transition-all ${overallScore === s
                                                        ? 'bg-green-600 text-white shadow-xl shadow-green-200 scale-105'
                                                        : 'bg-gray-50 text-gray-400 border border-transparent hover:border-green-300 hover:text-green-500'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Recommendation
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Strong Yes', 'Yes', 'No', 'Strong No'].map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRecommendation(r)}
                                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${recommendation === r
                                                        ? (r.includes('Yes') ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600')
                                                        : 'bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Final Summary & Notes</label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                    rows="4"
                                    placeholder="Summarize your final thoughts on the candidate..."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-xl shadow-green-200 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : 'Submit Scorecard'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScorecardModal;
