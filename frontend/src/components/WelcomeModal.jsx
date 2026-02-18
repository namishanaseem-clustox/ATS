import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Rocket, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasSeenWelcome', 'true');
        setIsOpen(false);
    };

    const handleGetStarted = () => {
        handleClose();
        // You could navigate to a specific "getting started" wizard here if it existed
        // For now, staying on Dashboard is fine as it has "Target's Focus"
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div className="fixed inset-0 transition-opacity z-0" aria-hidden="true" onClick={handleClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal Panel */}
                <div className="inline-block align-bottom bg-white rounded-xl text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10 relative overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-6 sm:px-6 text-white text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-white/20 mb-4">
                            <Rocket className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold">Welcome to Clustox ATS</h3>
                        <p className="mt-2 text-blue-100">Your hiring command center is ready.</p>
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm mt-0.5">1</span>
                                <div className="ml-3">
                                    <h4 className="text-base font-semibold text-gray-900">Create a Job</h4>
                                    <p className="text-sm text-gray-500">Define requirements and publish your first opening.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold text-sm mt-0.5">2</span>
                                <div className="ml-3">
                                    <h4 className="text-base font-semibold text-gray-900">Add Candidates</h4>
                                    <p className="text-sm text-gray-500">Upload resumes or manually add applicants to your pipeline.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 font-bold text-sm mt-0.5">3</span>
                                <div className="ml-3">
                                    <h4 className="text-base font-semibold text-gray-900">Score & Hire</h4>
                                    <p className="text-sm text-gray-500">Use AI screening and team scorecards to find the best fit.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                type="button"
                                onClick={handleGetStarted}
                                className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none transition-colors"
                            >
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default WelcomeModal;
