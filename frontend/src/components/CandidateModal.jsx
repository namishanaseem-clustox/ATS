import React from 'react';
import { X } from 'lucide-react';
import CandidateForm from './CandidateForm';

const CandidateModal = ({ isOpen, onClose, candidate, onSave }) => {
    if (!isOpen) return null;

    const handleSuccess = () => {
        if (onSave) onSave();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {candidate ? 'Edit Candidate' : 'Add Candidate'}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <CandidateForm
                            initialData={candidate}
                            onSuccess={handleSuccess}
                            onCancel={onClose}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateModal;
