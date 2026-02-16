import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Star, Save } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

const RECOMMENDATION_OPTIONS = [
    { value: 'Strong Yes', label: 'Strong Yes' },
    { value: 'Yes', label: 'Yes' },
    { value: 'Neutral', label: 'Neutral' },
    { value: 'No', label: 'No' },
    { value: 'Strong No', label: 'Strong No' }
];

const ScoreModal = ({ isOpen, onClose, candidateName, initialData, onSave }) => {
    const [scores, setScores] = useState({
        technical_score: 0,
        communication_score: 0,
        culture_fit_score: 0,
        problem_solving_score: 0,
        leadership_score: 0,
        recommendation: 'Neutral'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setScores(initialData);
        } else if (isOpen) {
            setScores({
                technical_score: 0,
                communication_score: 0,
                culture_fit_score: 0,
                problem_solving_score: 0,
                leadership_score: 0,
                recommendation: 'Neutral'
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleRating = (field, value) => {
        setScores(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSave(scores);
            onClose();
        } catch (error) {
            console.error("Failed to save score", error);
        } finally {
            setLoading(false);
        }
    };

    const renderStarRating = (field, label) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleRating(field, star)}
                        className={`p-1 focus:outline-none transition-colors ${scores[field] >= star ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                    >
                        <Star size={24} fill={scores[field] >= star ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        </div>
    );

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div className="fixed inset-0 transition-opacity z-0" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal Panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10 relative">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Score Candidate: <span className="text-[#00C853]">{candidateName}</span>
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {renderStarRating('technical_score', 'Technical Skills')}
                            {renderStarRating('communication_score', 'Communication')}
                            {renderStarRating('culture_fit_score', 'Culture Fit')}
                            {renderStarRating('problem_solving_score', 'Problem Solving')}
                            {renderStarRating('leadership_score', 'Leadership')}

                            <div className="mt-4">
                                <CustomSelect
                                    label="Overall Recommendation"
                                    value={scores.recommendation}
                                    onChange={(e) => setScores(prev => ({ ...prev, recommendation: e.target.value }))}
                                    options={RECOMMENDATION_OPTIONS}
                                    className="mb-0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#00C853] text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                            Save Score
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ScoreModal;
