import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRequisitions } from '../../api/requisitions';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb';

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
            <Breadcrumb items={[{ label: 'Requisitions' }]} />
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
            {/* Requisitions List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                                <th className="px-4 py-4">Req Code</th>
                                <th className="px-4 py-4">Job Title</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">Created</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                            {requisitions?.map((req, index) => {
                                const isEven = index % 2 === 0;
                                return (
                                    <tr key={req.id} className={`hover:bg-gray-50 transition-colors group ${isEven ? 'bg-white' : 'bg-[#fafafa]'}`}>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-[13px] font-medium text-gray-900">
                                            {req.req_code}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-gray-500">
                                            <div className="text-blue-600 font-medium">{req.job_title}</div>
                                            <div className="text-xs text-gray-400 capitalize">{req.employment_type} • {req.location}</div>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-[13px]">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${req.status === 'Open' ? 'bg-green-100 text-green-800' :
                                                    req.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                                        req.status === 'Filled' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-gray-500">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-[13px] font-medium">
                                            <Link to={`/requisitions/${req.id}`} className="text-[#00C853] hover:text-green-700 font-medium">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RequisitionsPage;
