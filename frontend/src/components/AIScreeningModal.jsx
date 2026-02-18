import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Brain, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { screenCandidate } from '../api/jobs';
import Counter from './Counter';

const AIScreeningModal = ({ isOpen, onClose, jobId, candidateId, candidateName, initialData, onScreeningComplete }) => {
    const [loading, setLoading] = useState(false);
    const [screeningData, setScreeningData] = useState(initialData || null);
    const [error, setError] = useState(null);

    // Reset screening data when candidate changes or modal opens with new data
    useEffect(() => {
        setScreeningData(initialData || null);
        setError(null);
    }, [candidateId, initialData]);

    if (!isOpen) return null;

    const handleScreen = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await screenCandidate(jobId, candidateId);
            setScreeningData(result.ai_analysis);
            // Call the callback if provided to update parent component
            if (onScreeningComplete) {
                onScreeningComplete(result);
            }
        } catch (err) {
            console.error("Screening failed:", err);
            setError(err.response?.data?.detail || "Failed to screen candidate. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-50 border-green-200';
        if (score >= 60) return 'bg-yellow-50 border-yellow-200';
        return 'bg-red-50 border-red-200';
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div className="fixed inset-0 transition-opacity z-0" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal Panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full z-10 relative">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div className="flex items-center">
                                <Brain className="h-6 w-6 text-purple-600 mr-2" />
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    AI Screening: <span className="text-[#00C853]">{candidateName}</span>
                                </h3>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {!screeningData && !loading && !error && (
                            <div className="text-center py-8">
                                <Brain className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                                <p className="text-gray-600 mb-4">No AI screening has been performed yet.</p>
                                <button
                                    onClick={handleScreen}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
                                >
                                    <Brain className="h-5 w-5 mr-2" />
                                    Run AI Screening
                                </button>
                            </div>
                        )}

                        {loading && (
                            <div className="text-center py-8">
                                <Loader2 className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-spin" />
                                <p className="text-gray-600">Analyzing candidate profile...</p>
                                <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                <div className="flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        )}

                        {screeningData && (
                            <div className="space-y-4">
                                {/* Match Score */}
                                <div className={`p-4 rounded-lg border-2 ${getScoreBgColor(screeningData.match_score)}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Match Score</span>
                                        <span className={`text-3xl font-bold ${getScoreColor(screeningData.match_score)}`}>
                                            <Counter end={screeningData.match_score} />/100
                                        </span>
                                    </div>
                                </div>

                                {/* Key Strengths */}
                                {screeningData.key_strengths && screeningData.key_strengths.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Key Strengths
                                        </h4>
                                        <ul className="space-y-1">
                                            {screeningData.key_strengths.map((strength, idx) => (
                                                <li key={idx} className="text-sm text-gray-600 flex items-start">
                                                    <span className="text-green-600 mr-2">•</span>
                                                    {strength}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Missing Skills */}
                                {screeningData.missing_skills && screeningData.missing_skills.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                            <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />
                                            Missing Skills
                                        </h4>
                                        <ul className="space-y-1">
                                            {screeningData.missing_skills.map((skill, idx) => (
                                                <li key={idx} className="text-sm text-gray-600 flex items-start">
                                                    <span className="text-orange-600 mr-2">•</span>
                                                    {skill}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Reasoning */}
                                {screeningData.reasoning && (
                                    <div className="bg-gray-50 p-4 rounded-md">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis</h4>
                                        <p className="text-sm text-gray-600">{screeningData.reasoning}</p>
                                    </div>
                                )}

                                {/* Re-screen button */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleScreen}
                                        disabled={loading}
                                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center disabled:opacity-50"
                                    >
                                        <Brain className="h-4 w-4 mr-1" />
                                        Re-run Screening
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AIScreeningModal;
