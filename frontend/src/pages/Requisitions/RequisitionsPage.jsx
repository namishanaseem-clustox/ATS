import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRequisitions } from '../../api/requisitions';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const RequisitionsPage = () => {
    const { user } = useAuth();
    const { data: requisitions, isLoading, isError } = useQuery({
        queryKey: ['requisitions'],
        queryFn: getRequisitions,
    });

    const isHiringManager = user?.role === 'hiring_manager';

    if (isLoading) return <div className="p-8">Loading requisitions...</div>;
    if (isError) return <div className="p-8 text-red-500">Failed to load requisitions.</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Job Requisitions</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isHiringManager ? 'Manage your hiring requests.' : 'Review and approve open job requisitions.'}
                    </p>
                </div>
                {isHiringManager && (
                    <Link
                        to="/requisitions/new"
                        className="flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                    >
                        <PlusCircle size={18} />
                        Request New Hire
                    </Link>
                )}
            </div>

            {/* Requisitions List */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Req Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {requisitions?.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {req.req_code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div>{req.job_title}</div>
                                    <div className="text-xs text-gray-400 capitalize">{req.employment_type} • {req.location}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${req.status === 'Open' ? 'bg-green-100 text-green-800' :
                                            req.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                                req.status === 'Filled' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(req.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link to={`/requisitions/${req.id}`} className="text-[#00C853] hover:text-green-700">
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RequisitionsPage;
