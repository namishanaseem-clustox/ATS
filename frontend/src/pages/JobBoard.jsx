import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

import { getJobs } from '../api/jobs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDepartments } from '../api/departments';

const JobBoard = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [departmentName, setDepartmentName] = useState('');
    const navigate = useNavigate();

    const departmentId = searchParams.get('dept');
    const statusFilter = searchParams.get('status');

    const filteredJobs = jobs.filter(job => {
        if (statusFilter && job.status !== statusFilter) return false;
        return true;
    });

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const data = await getJobs(departmentId);
                setJobs(data);
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [departmentId]);

    useEffect(() => {
        const fetchDepartmentName = async () => {
            if (departmentId) {
                try {
                    const departments = await getDepartments();
                    const dept = departments.find(d => d.id === departmentId);
                    setDepartmentName(dept?.name || 'Unknown Department');
                } catch (error) {
                    console.error("Failed to fetch department", error);
                }
            }
        };
        fetchDepartmentName();
    }, [departmentId]);

    const clearFilter = () => {
        setSearchParams({});
        setDepartmentName('');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading jobs...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Jobs</h1>
                    {departmentId && departmentName && (
                        <div className="flex items-center mt-2 text-sm">
                            <span className="text-gray-600 mr-2">Filtered by:</span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-[#00C853] font-medium mr-2">
                                {departmentName}
                                <button
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('dept');
                                        setSearchParams(newParams);
                                        setDepartmentName('');
                                    }}
                                    className="ml-2 hover:bg-green-100 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                            {statusFilter && (
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
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => navigate('/jobs/new')}
                    className="flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={20} className="mr-2" />
                    Create Job
                </button>
            </div>

            {filteredJobs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-4">
                        {departmentId ? `No jobs found for ${departmentName}.` : 'No jobs found.'}
                    </p>
                    <button
                        onClick={() => navigate('/jobs/new')}
                        className="text-[#00C853] font-medium hover:underline"
                    >
                        Create your first job
                    </button>
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
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum Salary</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maximum Salary</th>
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
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {job.min_salary ? job.min_salary.toLocaleString() : 'Negotiable'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {job.max_salary ? job.max_salary.toLocaleString() : 'Negotiable'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobBoard;
