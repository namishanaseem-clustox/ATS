import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Star, Save, Loader2 } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { getScorecardTemplate } from '../api/scorecards';

const RECOMMENDATION_OPTIONS = [
    { value: 'Strong Yes', label: '🌟 Strong Yes' },
    { value: 'Yes', label: '✅ Yes' },
    { value: 'Neutral', label: '⚪ Neutral' },
    { value: 'No', label: '❌ No' },
    { value: 'Strong No', label: '🚫 Strong No' }
];

const DEFAULT_SECTIONS = [
    { key: 'technical_score', label: 'Technical Skills' },
    { key: 'communication_score', label: 'Communication' },
    { key: 'culture_fit_score', label: 'Culture Fit' },
    { key: 'problem_solving_score', label: 'Problem Solving' },
    { key: 'leadership_score', label: 'Leadership' },
];

const StarRating = ({ value, onChange }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className={`p-0.5 focus:outline-none transition-colors ${value >= star ? 'text-yellow-400' : 'text-gray-200'}`}
            >
                <Star size={22} fill={value >= star ? 'currentColor' : 'none'} />
            </button>
        ))}
        <span className="ml-2 text-sm text-gray-500">{value > 0 ? `${value}/5` : 'Not rated'}</span>
    </div>
);

// templateId: optional UUID — if provided, dynamic sections are loaded from template
const ScoreModal = ({ isOpen, onClose, candidateName, initialData, onSave, templateId = null }) => {
    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [templateLoading, setTemplateLoading] = useState(false);

    // Load template sections when modal opens / templateId changes
    useEffect(() => {
        if (!isOpen) return;

        if (templateId) {
            setTemplateLoading(true);
            getScorecardTemplate(templateId)
                .then((tpl) => setSections(tpl.sections || DEFAULT_SECTIONS))
                .catch(() => setSections(DEFAULT_SECTIONS))
                .finally(() => setTemplateLoading(false));
        } else {
            setSections(DEFAULT_SECTIONS);
        }
    }, [isOpen, templateId]);

    // Init scores when modal opens
    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setScores({ recommendation: 'Neutral', ...initialData });
        } else {
            setScores({ recommendation: 'Neutral' });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleRating = (key, value) => {
        setScores(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSave(scores);
            onClose();
        } catch (error) {
            console.error('Failed to save score', error);
        } finally {
            setLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-gray-500 opacity-75 z-0" onClick={onClose} />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal */}
                <div className="relative inline-block bg-white rounded-xl text-left shadow-2xl transform transition-all w-full max-w-lg z-10">
                    <div className="px-6 pt-5 pb-4">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-5 border-b pb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Score Candidate</h3>
                                <p className="text-sm text-green-600 font-medium mt-0.5">{candidateName}</p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scoring Criteria */}
                        {templateLoading ? (
                            <div className="flex items-center justify-center py-8 text-gray-400">
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                Loading scorecard...
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {sections.map((section) => (
                                    <div key={section.key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            {section.label}
                                            {section.weight > 1 && (
                                                <span className="ml-2 text-xs text-green-600 font-normal">×{section.weight} weight</span>
                                            )}
                                        </label>
                                        <StarRating
                                            value={scores[section.key] || 0}
                                            onChange={(v) => handleRating(section.key, v)}
                                        />
                                    </div>
                                ))}

                                {/* Overall Recommendation */}
                                <div className="pt-2 border-t border-gray-100">
                                    <CustomSelect
                                        label="Overall Recommendation"
                                        value={scores.recommendation || 'Neutral'}
                                        onChange={(e) => setScores(prev => ({ ...prev, recommendation: e.target.value }))}
                                        options={RECOMMENDATION_OPTIONS}
                                        className="mb-0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex flex-row-reverse gap-3">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || templateLoading}
                            className="inline-flex items-center justify-center rounded-lg border border-transparent shadow-sm px-5 py-2 bg-green-600 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Score
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
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
