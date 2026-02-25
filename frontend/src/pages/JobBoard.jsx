import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Trash2, Archive, SlidersHorizontal, Briefcase, Columns, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getJobs, updateJob, permanentlyDeleteJob } from '../api/jobs';
import { getDepartments } from '../api/departments';
import PermanentDeleteModal from '../components/PermanentDeleteModal';
import Breadcrumb from '../components/Breadcrumb';
import ColumnSelector from '../components/ColumnSelector';
import useColumnPersistence from '../hooks/useColumnPersistence';

const JOB_COLUMNS = [
    { id: 'title', label: 'Position Name', required: true },
    { id: 'department', label: 'Job Department' },
    { id: 'location', label: 'Job Location' },
    { id: 'headcount', label: 'Headcount' },
    { id: 'stage', label: 'Job Stage' },
    { id: 'salary', label: 'Salary Range' }
];

const JobBoard = ({ embeddedDepartmentId }) => {
    const [visibleColumns, toggleColumn] = useColumnPersistence('clustox_jobs_columns', JOB_COLUMNS.map(c => c.id));
    const [showFilters, setShowFilters] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { user } = useAuth();

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
            {/* Breadcrumb ONLY if NOT embedded */}
            {!embeddedDepartmentId && (
                <Breadcrumb items={[
                    ...(selectedDepartment ? [{ label: 'Departments', to: '/departments' }, { label: selectedDepartment.name, to: `/departments/${departmentId}` }] : []),
                    { label: 'Jobs' }
                ]} />
            )}

            {/* Page header */}
            <div className={`flex ${embeddedDepartmentId ? 'justify-end' : 'justify-between'} items-center mb-6`}>
                {!embeddedDepartmentId && (
                    <div>
                        {selectedDepartment ? (
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{selectedDepartment.name}</h1>
                                <p className="text-gray-500 mt-1">{selectedDepartment.description || 'No description available.'}</p>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
                                <p className="text-gray-500 mt-1">All open positions across your organization.</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title, department, or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm transition-all w-80 shadow-sm"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(f => !f)}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Filter size={16} /> Filters
                            {statusFilter === 'Archived' && (
                                <span className="bg-[#4caf50] text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">1</span>
                            )}
                        </button>

                        {showFilters && (
                            <div className="absolute top-12 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 shrink-0">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h4 className="font-semibold text-gray-800 text-sm">Filter Jobs</h4>
                                    {statusFilter && (
                                        <button
                                            onClick={() => { const p = new URLSearchParams(searchParams); p.delete('status'); setSearchParams(p); }}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wider uppercase">Status</label>
                                        <select
                                            value={statusFilter || 'All'}
                                            onChange={(e) => {
                                                const newStatus = e.target.value === 'All' ? null : e.target.value;
                                                const newParams = new URLSearchParams(searchParams);
                                                if (newStatus) newParams.set('status', newStatus);
                                                else newParams.delete('status');
                                                setSearchParams(newParams);
                                            }}
                                            className="w-full border border-gray-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500 text-gray-700 shadow-sm"
                                        >
                                            <option value="All">All Jobs</option>
                                            <option value="Archived">Archived</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0">
                        <ColumnSelector
                            columns={JOB_COLUMNS}
                            visibleColumns={visibleColumns}
                            onToggle={(id) => {
                                const col = JOB_COLUMNS.find(c => c.id === id);
                                if (col && col.required) return;
                                toggleColumn(id);
                            }}
                        />
                    </div>
                </div>
            </div>

            {
                filteredJobs.length === 0 ? (
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
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                            <RoleGuard allowedRoles={['hr', 'owner', 'hiring_manager']}>
                                <button
                                    onClick={() => navigate(departmentId ? `/jobs/new?dept=${departmentId}` : '/jobs/new')}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    + Create Job
                                </button>
                            </RoleGuard>
                            <div className="text-sm text-gray-500">
                                Results: <span className="font-semibold text-gray-700">{filteredJobs.length}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto min-h-[500px]">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                                        {visibleColumns.includes('title') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Position Name</th>}
                                        {visibleColumns.includes('department') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Job Department</th>}
                                        {visibleColumns.includes('location') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Job Location</th>}
                                        {visibleColumns.includes('headcount') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Headcount</th>}
                                        {visibleColumns.includes('stage') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Job Stage</th>}
                                        {visibleColumns.includes('salary') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Salary Range</th>}
                                        {statusFilter === 'Archived' && (
                                            <th className="px-4 py-4 cursor-pointer hover:bg-gray-50 text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                                    {filteredJobs.map((job, index) => {
                                        const isEven = index % 2 === 0;
                                        return (
                                            <tr
                                                key={job.id}
                                                className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isEven ? 'bg-white' : 'bg-[#fafafa]'}`}
                                                onClick={() => navigate(`/jobs/${job.id}`)}
                                            >
                                                {visibleColumns.includes('title') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-blue-600 hover:text-blue-800">{job.title}</div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('department') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        {job.department ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                {job.department.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[13px] text-gray-500">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                {visibleColumns.includes('location') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="text-[13px] text-gray-600">{job.location}</div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('headcount') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="text-[13px] text-gray-900">{job.headcount}</div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('stage') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-[10px] leading-5 font-semibold rounded-full ${job.status === 'Published' ? 'bg-green-100 text-green-800' :
                                                            job.status === 'Archived' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('salary') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-gray-600">
                                                        {job.min_salary && job.max_salary
                                                            ? `${job.min_salary.toLocaleString()} - ${job.max_salary.toLocaleString()}`
                                                            : 'Negotiable'}
                                                    </td>
                                                )}
                                                {statusFilter === 'Archived' && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
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
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            < PermanentDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setJobToDelete(null);
                }}
                onConfirm={handlePermanentDelete}
                jobTitle={jobToDelete?.title || ''}
                loading={deleteLoading}
            />
        </div >
    );
};

export default JobBoard;
