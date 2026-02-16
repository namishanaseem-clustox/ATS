import React, { useState, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getJobs, updateJob, permanentlyDeleteJob } from '../api/jobs';
import { getDepartments } from '../api/departments';
import PermanentDeleteModal from '../components/PermanentDeleteModal';

const JobBoard = ({ embeddedDepartmentId }) => {
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [inputValue, setInputValue] = useState('');

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
                <div className="flex justify-between items-center mb-6">
                    <div>
                        {selectedDepartment ? (
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-800">{selectedDepartment.name}</h1>
                                </div>
                                <p className="text-gray-500 mt-1">{selectedDepartment.description || 'No description available.'}</p>
                            </div>
                        ) : (
                            <h1 className="text-2xl font-bold text-gray-800">Jobs</h1>
                        )}

                        {statusFilter && (
                            <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                                    Status: {statusFilter}
                                    <button
                                        onClick={() => {
                                            const newParams = new URLSearchParams(searchParams);
                                            newParams.delete('status');
                                            setSearchParams(newParams);
                                        }}
                                        className="ml-2 hover:bg-blue-100 rounded-full p-0.5"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => navigate(departmentId ? `/jobs/new?dept=${departmentId}` : '/jobs/new')}
                        className="flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={20} className="mr-2" />
                        Create Job
                    </button>
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4 justify-between">
                <div className="flex gap-4 flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search jobs by title, department, or location..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSearch}
                        className="flex items-center px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 bg-gray-50 active:bg-gray-200 transition-colors"
                    >
                        <Search size={18} className="mr-2" /> Search
                    </button>
                    <button
                        onClick={() => {
                            const newStatus = statusFilter === 'Archived' ? null : 'Archived';
                            const newParams = new URLSearchParams(searchParams);
                            if (newStatus) {
                                newParams.set('status', newStatus);
                            } else {
                                newParams.delete('status');
                            }
                            setSearchParams(newParams);
                        }}
                        className={`flex items-center px-4 py-2 border rounded-md transition-colors ${statusFilter === 'Archived'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {statusFilter === 'Archived' ? 'Show Active Jobs' : 'Show Archived'}
                    </button>
                </div>
            </div>

            {filteredJobs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-4">
                        {statusFilter === 'Archived'
                            ? 'No archived jobs found.'
                            : (departmentId ? `No jobs found for ${selectedDepartment?.name || 'this department'}.` : 'No jobs found.')
                        }
                    </p>
                    {statusFilter !== 'Archived' && (
                        <button
                            onClick={() => navigate(departmentId ? `/jobs/new?dept=${departmentId}` : '/jobs/new')}
                            className="text-[#00C853] font-medium hover:underline"
                        >
                            Create your first job
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
