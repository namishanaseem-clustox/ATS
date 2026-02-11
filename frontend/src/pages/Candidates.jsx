import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { getCandidates, deleteCandidate } from '../api/candidates';
import CandidateCard from '../components/CandidateCard';
import CandidateForm from '../components/CandidateForm';
import ResumeUpload from '../components/ResumeUpload';

const Candidates = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('upload'); // 'upload' or 'manual'

    const fetchCandidates = async () => {
        try {
            setLoading(true);
            const data = await getCandidates();
            setCandidates(data);
        } catch (error) {
            console.error("Failed to fetch candidates", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this candidate?")) {
            try {
                await deleteCandidate(id);
                setCandidates(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error("Failed to delete candidate", error);
                alert("Failed to delete candidate.");
            }
        }
    };

    const handleSuccess = () => {
        setShowModal(false);
        fetchCandidates();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Candidates</h1>
                    <p className="text-gray-500 mt-1">Manage your talent pool and applicants.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={20} className="mr-2" />
                    Add Candidate
                </button>
            </div>

            {/* Filters placeholder */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search candidates by name, email, or skills..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                </div>
                <button className="flex items-center px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50">
                    <Filter size={18} className="mr-2" /> Filter
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading candidates...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidates.length > 0 ? (
                        candidates.map(candidate => (
                            <CandidateCard
                                key={candidate.id}
                                candidate={candidate}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <p className="text-gray-500 text-lg mb-2">No candidates found.</p>
                            <p className="text-gray-400 text-sm">Upload a resume or add a candidate manually to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Candidate Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div
                            className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                                            Add New Candidate
                                        </h3>

                                        <div className="border-b border-gray-200 mb-4">
                                            <nav className="-mb-px flex space-x-6">
                                                <button
                                                    onClick={() => setActiveModalTab('upload')}
                                                    className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeModalTab === 'upload'
                                                        ? 'border-[#00C853] text-[#00C853]'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        }`}
                                                >
                                                    Upload Resume
                                                </button>
                                                <button
                                                    onClick={() => setActiveModalTab('manual')}
                                                    className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeModalTab === 'manual'
                                                        ? 'border-[#00C853] text-[#00C853]'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        }`}
                                                >
                                                    Manual Entry
                                                </button>
                                            </nav>
                                        </div>

                                        {activeModalTab === 'upload' ? (
                                            <ResumeUpload onUploadSuccess={handleSuccess} />
                                        ) : (
                                            <CandidateForm onSuccess={handleSuccess} onCancel={() => setShowModal(false)} />
                                        )}
                                    </div>
                                </div>
                            </div>
                            {(activeModalTab === 'upload') && (
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Candidates;
