import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRequisitions } from '../../api/requisitions';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Search, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb';
import ColumnSelector from '../../components/ColumnSelector';
import FilterPanel from '../../components/FilterPanel';
import useColumnPersistence from '../../hooks/useColumnPersistence';

const REQ_COLUMNS = [
    { id: 'req_code', label: 'Req Code', required: true },
    { id: 'job_title', label: 'Job Title' },
    { id: 'status', label: 'Status' },
    { id: 'created_at', label: 'Created' },
];

const RequisitionsPage = () => {
    const { user } = useAuth();
    const { data: requisitions, isLoading, isError } = useQuery({
        queryKey: ['requisitions'],
        queryFn: getRequisitions,
    });

    const isHiringManager = user?.role === 'hiring_manager';

    const [visibleColumns, toggleColumn] = useColumnPersistence('clustox_requisitions_columns', REQ_COLUMNS.map(c => c.id));
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    if (isLoading) return <div className="p-8">Loading requisitions...</div>;
    if (isError) return <div className="p-8 text-red-500">Failed to load requisitions.</div>;

    const safeRequisitions = requisitions || [];

    // Derive filter options from loaded requisitions
    const allStatuses = [...new Set(safeRequisitions.map(r => r.status).filter(Boolean))];
    const allLocations = [...new Set(safeRequisitions.map(r => r.location).filter(Boolean))];

    const filterConfig = [
        {
            key: 'status',
            label: 'Status',
            options: allStatuses.map(s => ({
                value: s,
                label: s,
                count: safeRequisitions.filter(r => r.status === s).length
            }))
        },
        {
            key: 'location',
            label: 'Location',
            options: allLocations.map(l => ({
                value: l,
                label: l,
                count: safeRequisitions.filter(r => r.location === l).length
            }))
        }
    ];

    // Filter requisitions by search + checkboxes
    const filteredRequisitions = safeRequisitions.filter(req => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query ||
            (req.req_code || '').toLowerCase().includes(query) ||
            (req.job_title || '').toLowerCase().includes(query) ||
            (req.location || '').toLowerCase().includes(query);

        const statusSel = activeFilters.status || [];
        const locSel = activeFilters.location || [];

        const matchesStatus = statusSel.length === 0 || statusSel.includes(req.status);
        const matchesLoc = locSel.length === 0 || locSel.includes(req.location);

        return matchesSearch && matchesStatus && matchesLoc;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <Breadcrumb items={[{ label: 'Requisitions' }]} />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Job Requisitions</h1>
                    <p className="text-gray-500 mt-1">
                        {isHiringManager ? 'Manage your hiring requests.' : 'Review and approve open job requisitions.'}
                    </p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by req code, title, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm transition-all w-80 shadow-sm"
                        />
                    </div>

                    <FilterPanel
                        filters={filterConfig}
                        activeFilters={activeFilters}
                        onChange={(key, values) => setActiveFilters(prev => ({ ...prev, [key]: values }))}
                        onClear={() => setActiveFilters({})}
                    />

                    <div className="flex-shrink-0">
                        <ColumnSelector
                            columns={REQ_COLUMNS}
                            visibleColumns={visibleColumns}
                            onToggle={(id) => {
                                const col = REQ_COLUMNS.find(c => c.id === id);
                                if (col && col.required) return;
                                toggleColumn(id);
                            }}
                        />
                    </div>
                </div>
            </div>

            {filteredRequisitions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                            <Briefcase size={24} className="text-gray-400" />
                        </div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">
                        No requisitions found
                    </h3>
                    <p className="text-sm text-gray-400 mb-5">
                        {searchQuery || Object.keys(activeFilters).length > 0
                            ? 'Adjust your search or filters to see more results.'
                            : 'There are currently no job requisitions.'}
                    </p>
                    {isHiringManager && (!searchQuery && Object.keys(activeFilters).length === 0) && (
                        <Link
                            to="/requisitions/new"
                            className="inline-flex items-center px-4 py-2 bg-[#00C853] text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                        >
                            <PlusCircle size={16} className="mr-2" /> Request New Hire
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                        {isHiringManager ? (
                            <Link
                                to="/requisitions/new"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                            >
                                + Request New Hire
                            </Link>
                        ) : <div />}
                        <div className="text-sm text-gray-500">
                            Results: <span className="font-semibold text-gray-700">{filteredRequisitions.length}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto min-h-[500px]">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                                    {visibleColumns.includes('req_code') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Req Code</th>}
                                    {visibleColumns.includes('job_title') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Job Title</th>}
                                    {visibleColumns.includes('status') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Status</th>}
                                    {visibleColumns.includes('created_at') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Created</th>}
                                    <th className="px-4 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                                {filteredRequisitions.map((req, index) => {
                                    const isEven = index % 2 === 0;
                                    return (
                                        <tr key={req.id} className={`hover:bg-gray-50 transition-colors group ${isEven ? 'bg-white' : 'bg-[#fafafa]'}`}>
                                            {visibleColumns.includes('req_code') && (
                                                <td className="px-4 py-3.5 whitespace-nowrap text-[13px] font-medium text-gray-900">
                                                    {req.req_code}
                                                </td>
                                            )}
                                            {visibleColumns.includes('job_title') && (
                                                <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-gray-500">
                                                    <div className="text-blue-600 font-medium">{req.job_title}</div>
                                                    <div className="text-xs text-gray-400 capitalize">{req.employment_type} • {req.location}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('status') && (
                                                <td className="px-4 py-3.5 whitespace-nowrap text-[13px]">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${req.status === 'Open' ? 'bg-green-100 text-green-800' :
                                                            req.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                                                                req.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                                                    req.status === 'Filled' ? 'bg-purple-100 text-purple-800' :
                                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.includes('created_at') && (
                                                <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-gray-500">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </td>
                                            )}
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
            )}
        </div>
    );
};

export default RequisitionsPage;
