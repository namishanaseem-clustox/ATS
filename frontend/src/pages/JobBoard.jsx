import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Trash2, Archive, SlidersHorizontal, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getJobs, updateJob, permanentlyDeleteJob } from '../api/jobs';
import { getDepartments } from '../api/departments';
import PermanentDeleteModal from '../components/PermanentDeleteModal';
import Breadcrumb from '../components/Breadcrumb';

const JobBoard = ({ embeddedDepartmentId }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [inputValue, setInputValue] = useState('');
    const { user } = useAuth();

    // Permanent Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const navigate = useNavigate();

    const handleSearch = () => {
        setSearchQuery(inputValue);
    };

    const handlePermanentDelete = async () => {
        if (!jobToDelete) return;

        setDeleteLoading(true);
        try {
            await permanentlyDeleteJob(jobToDelete.id);
            // Refresh list
            const data = await getJobs(departmentId, statusFilter);
            setJobs(data);
            setIsDeleteModalOpen(false);
            setJobToDelete(null);
        } catch (error) {
            console.error("Failed to delete job", error);
            alert(error.response?.data?.detail || "Failed to permanently delete job");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Use embedded ID if provided, otherwise check URL params
    const departmentId = embeddedDepartmentId || searchParams.get('dept');
    const statusFilter = searchParams.get('status');

    // Filter jobs by status and search query
    const filteredJobs = jobs.filter(job => {
        // Status filter
        if (statusFilter && job.status !== statusFilter) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const title = (job.title || '').toLowerCase();
            const department = (job.department?.name || '').toLowerCase();
            const location = (job.location || '').toLowerCase();
            return title.includes(query) || department.includes(query) || location.includes(query);
        }

        return true;
    });

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const data = await getJobs(departmentId, statusFilter);
                setJobs(data);
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [departmentId, statusFilter]);

    useEffect(() => {
        const fetchDepartmentDetails = async () => {
            if (departmentId) {
                try {
                    const departments = await getDepartments();
                    const dept = departments.find(d => d.id === departmentId);
                    setSelectedDepartment(dept || null);
                } catch (error) {
                    console.error("Failed to fetch department", error);
                }
            } else {
                setSelectedDepartment(null);
            }
        };
        fetchDepartmentDetails();
    }, [departmentId]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading jobs...</div>;

    return (
        <div className={embeddedDepartmentId ? "p-4" : "p-8 max-w-7xl mx-auto"}>
            {/* Show header ONLY if NOT embedded */}
            {!embeddedDepartmentId && (
                <>
                    {/* Breadcrumb */}
                    <Breadcrumb items={[
                        ...(selectedDepartment ? [{ label: 'Departments', to: '/departments' }, { label: selectedDepartment.name, to: `/departments/${departmentId}` }] : []),
                        { label: 'Jobs' }
                    ]} />

                    {/* Page header — max 2 primary actions */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            {selectedDepartment ? (
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">{selectedDepartment.name}</h1>
                                    <p className="text-gray-500 mt-1">{selectedDepartment.description || 'No description available.'}</p>
                                </div>
                            ) : (
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">Jobs</h1>
                                    <p className="text-gray-500 mt-1">All open positions across your organization.</p>
                                </div>
                            )}
                        </div>
                        {/* PRIMARY action only — secondary is the filter toggle below */}
                        <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                            <button
                                onClick={() => navigate(departmentId ? `/jobs/new?dept=${departmentId}` : '/jobs/new')}
                                className="flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
                            >
                                <Plus size={18} className="mr-2" />
                                New Job
                            </button>
                        </RoleGuard>
                    </div>
                </>
            )}

            {/* Search bar + SECONDARY action: Filters toggle */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4 flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by title, department, or location..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="flex items-center px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <Search size={15} className="mr-1.5" /> Search
                </button>
                {/* SECONDARY action — collapses extra options */}
                <button
                    onClick={() => setShowFilters(f => !f)}
                    className={`flex items-center px-4 py-2 border rounded-md text-sm transition-colors ${showFilters || statusFilter === 'Archived'
                            ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <SlidersHorizontal size={15} className="mr-1.5" />
                    Filters
                    {statusFilter === 'Archived' && <span className="ml-1.5 bg-[#00C853] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">1</span>}
                </button>
            </div>

            {/* Collapsible filter panel */}
            {showFilters && (
                <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 mb-4 flex items-center gap-4 shadow-sm">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                    <button
                        onClick={() => {
                            const newStatus = statusFilter === 'Archived' ? null : 'Archived';
                            const newParams = new URLSearchParams(searchParams);
                            if (newStatus) newParams.set('status', newStatus);
                            else newParams.delete('status');
                            setSearchParams(newParams);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === 'Archived'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {statusFilter === 'Archived' ? '✓ Archived' : 'Archived'}
                    </button>
                    {statusFilter && (
                        <button
                            onClick={() => { const p = new URLSearchParams(searchParams); p.delete('status'); setSearchParams(p); }}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                            <X size={12} /> Clear filters
                        </button>
                    )}
                </div>
            )}

            {filteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                            <Briefcase size={24} className="text-gray-400" />
                        </div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">
                        {statusFilter === 'Archived' ? 'No archived jobs' : 'No jobs yet'}
                    </h3>
                    <p className="text-sm text-gray-400 mb-5">
                        {statusFilter === 'Archived'
                            ? 'Archived jobs will appear here.'
                            : (departmentId ? `Start hiring for ${selectedDepartment?.name || 'this department'}.` : 'Post your first open position to start hiring.')
                        }
                    </p>
                    {statusFilter !== 'Archived' && (
                        <button
                            onClick={() => navigate(departmentId ? `/jobs/new?dept=${departmentId}` : '/jobs/new')}
                            className="inline-flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                        >
                            <Plus size={16} className="mr-2" /> Create your first job
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Department</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Location</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headcount</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Stage</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Range</th>
                                    {statusFilter === 'Archived' && (
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredJobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-blue-600 hover:text-blue-800">{job.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {job.department ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {job.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{job.location}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{job.headcount}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status === 'Published' ? 'bg-green-100 text-green-800' :
                                                job.status === 'Archived' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {job.min_salary && job.max_salary
                                                ? `${job.min_salary.toLocaleString()} - ${job.max_salary.toLocaleString()}`
                                                : 'Negotiable'}
                                        </td>
                                        {statusFilter === 'Archived' && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Are you sure you want to unarchive this job?')) {
                                                                try {
                                                                    await updateJob(job.id, { status: 'Draft' });
                                                                    // Refresh list
                                                                    const data = await getJobs(departmentId, statusFilter); // Pass correct filter
                                                                    setJobs(data);
                                                                } catch (error) {
                                                                    console.error("Failed to unarchive", error);
                                                                    alert("Failed to unarchive job");
                                                                }
                                                            }
                                                        }}
                                                        className="text-[#00C853] hover:text-green-900 font-medium"
                                                    >
                                                        Unarchive
                                                    </button>
                                                </RoleGuard>
                                                {['hr', 'owner'].includes(user?.role) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setJobToDelete(job);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 font-medium ml-4"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <PermanentDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setJobToDelete(null);
                }}
                onConfirm={handlePermanentDelete}
                jobTitle={jobToDelete?.title || ''}
                loading={deleteLoading}
            />
        </div>
    );
};

export default JobBoard;
