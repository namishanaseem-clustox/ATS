import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Columns } from 'lucide-react';
import { getCandidates, deleteCandidate } from '../api/candidates';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';
import CandidateForm from '../components/CandidateForm';
import ResumeUpload from '../components/ResumeUpload';
import Breadcrumb from '../components/Breadcrumb';
import ColumnSelector from '../components/ColumnSelector';
import useColumnPersistence from '../hooks/useColumnPersistence';

const CANDIDATE_COLUMNS = [
    { id: 'name', label: 'Candidate Name', required: true },
    { id: 'position', label: 'Current Position' },
    { id: 'company', label: 'Current Company' },
    { id: 'notice', label: 'Notice Period' },
    { id: 'experience', label: 'Years of Exp' },
    { id: 'university', label: 'University' },
    { id: 'actions', label: 'Actions', required: true }
];

const Candidates = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('upload'); // 'upload' or 'manual'
    const [searchQuery, setSearchQuery] = useState('');
    const [inputValue, setInputValue] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [visibleColumns, toggleColumn] = useColumnPersistence('clustox_candidates_columns', CANDIDATE_COLUMNS.map(c => c.id));

    const handleSearch = () => {
        setSearchQuery(inputValue);
    };

    // Filter candidates based on search query
    const filteredCandidates = candidates.filter(candidate => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase();
        const email = (candidate.email || '').toLowerCase();
        const skills = (candidate.skills || []).map(s => s.toLowerCase()).join(' ');
        return fullName.includes(query) || email.includes(query) || skills.includes(query);
    });

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

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent row click when deleting
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
            <Breadcrumb items={[{ label: 'Candidates' }]} />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Candidates</h1>
                    <p className="text-gray-500 mt-1">Manage your talent pool and applicants.</p>
                </div>
                <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Candidate
                    </button>
                </RoleGuard>
            </div>

            {/* Filters placeholder */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search candidates by name, email, or skills..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="flex items-center px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 bg-gray-50 active:bg-gray-200 transition-colors"
                >
                    <Search size={18} className="mr-2" /> Search
                </button>

                {/* Column Selector */}
                <div className="flex-shrink-0">
                    <ColumnSelector
                        columns={CANDIDATE_COLUMNS}
                        visibleColumns={visibleColumns}
                        onToggle={(id) => {
                            // Don't allowing toggling required columns
                            const col = CANDIDATE_COLUMNS.find(c => c.id === id);
                            if (col && col.required) return;
                            toggleColumn(id);
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading candidates...</div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    {filteredCandidates.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {visibleColumns.includes('name') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>}
                                        {visibleColumns.includes('position') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Position</th>}
                                        {visibleColumns.includes('company') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Company</th>}
                                        {visibleColumns.includes('notice') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notice Period</th>}
                                        {visibleColumns.includes('experience') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Years of Exp</th>}
                                        {visibleColumns.includes('university') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>}
                                        {visibleColumns.includes('actions') && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCandidates.map((candidate) => (
                                        <tr
                                            key={candidate.id}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/candidates/${candidate.id}`)}
                                        >
                                            {visibleColumns.includes('name') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-[#00C853] text-white font-bold">
                                                            {candidate.first_name && candidate.first_name[0]}{candidate.last_name && candidate.last_name[0]}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                                                {candidate.first_name} {candidate.last_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('position') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{candidate.current_position || '-'}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('company') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">{candidate.current_company || '-'}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('notice') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{candidate.notice_period ? `${candidate.notice_period} Days` : 'Immediate'}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('experience') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{candidate.experience_years || 0}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('university') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">
                                                        {candidate.education && candidate.education.length > 0 ? candidate.education[0].school : '-'}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('actions') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                                        <button
                                                            onClick={(e) => handleDelete(e, candidate.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    </RoleGuard>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-center mb-4">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Users size={24} className="text-gray-400" />
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-gray-700 mb-1">No candidates yet</h3>
                            <p className="text-sm text-gray-400 mb-5">Upload a resume or add a candidate manually to start building your talent pool.</p>
                            <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="inline-flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                                >
                                    <Plus size={16} className="mr-2" /> Add your first candidate
                                </button>
                            </RoleGuard>
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
