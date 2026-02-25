import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Columns, Edit, Trash2 } from 'lucide-react';

import ActionMenu from '../../components/ActionMenu';

import DepartmentModal from '../../components/DepartmentModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import useDepartmentStore from '../../store/useDepartmentStore';
import RoleGuard from '../../components/RoleGuard';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments';
import { useAuth } from '../../context/AuthContext';
import Breadcrumb from '../../components/Breadcrumb';
import ColumnSelector from '../../components/ColumnSelector';
import FilterPanel from '../../components/FilterPanel';
import useColumnPersistence from '../../hooks/useColumnPersistence';

const DEPARTMENT_COLUMNS = [
    { id: 'name', label: 'Department Name', required: true },
    { id: 'job_count', label: 'Job Count' },
    { id: 'location', label: 'Department Location' },
    { id: 'status', label: 'Department Status' },
    { id: 'owner', label: 'Department Owner' },
    { id: 'created_at', label: 'Department Created' },
    { id: 'actions', label: 'Actions', required: true }
];

const DepartmentsPage = ({ readOnly = false }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        isModalOpen,
        selectedDepartment,
        openCreateModal,
        openEditModal,
        closeModal
    } = useDepartmentStore();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [visibleColumns, toggleColumn] = useColumnPersistence('clustox_departments_columns', DEPARTMENT_COLUMNS.map(c => c.id));

    // FilterPanel state
    const [activeFilters, setActiveFilters] = useState({});

    const { data: departments, isLoading, isError } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    });

    // Derive filter options from data
    const deptList = departments || [];
    const allStatuses = [...new Set(deptList.map(d => d.status).filter(Boolean))];
    const allOwners = [...new Set(deptList.map(d => d.owner?.full_name).filter(Boolean))].sort();

    const getCreatedBucket = (iso) => {
        if (!iso) return null;
        const diffDays = Math.floor((new Date() - new Date(iso)) / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays === 2) return '2 Days Ago';
        if (diffDays === 3) return '3 Days Ago';
        if (diffDays <= 7) return 'This Week';
        if (diffDays <= 30) return 'Last Month';
        return 'Older';
    };
    const createdBucketOrder = ['Today', 'Yesterday', '2 Days Ago', '3 Days Ago', 'This Week', 'Last Month', 'Older'];

    const filterConfig = [
        {
            key: 'status',
            label: 'Status',
            options: allStatuses.map(s => ({
                value: s,
                label: s,
                count: deptList.filter(d => d.status === s).length
            }))
        },
        {
            key: 'owner',
            label: 'Owner',
            options: allOwners.map(name => ({
                value: name,
                label: name,
                count: deptList.filter(d => d.owner?.full_name === name).length
            }))
        },
        {
            key: 'created',
            label: 'Created',
            options: createdBucketOrder.map(b => ({
                value: b,
                label: b,
                count: deptList.filter(d => getCreatedBucket(d.created_at) === b).length
            }))
        }
    ];

    // Filter departments based on search + checkboxes
    const filteredDepartments = deptList.filter(dept => {
        const query = searchQuery.toLowerCase();
        const name = (dept.name || '').toLowerCase();
        const location = (dept.location || '').toLowerCase();
        const owner = (dept.owner?.full_name || '').toLowerCase();
        const matchesSearch = !query || name.includes(query) || location.includes(query) || owner.includes(query);

        const statusSelected = activeFilters.status || [];
        const ownerSelected = activeFilters.owner || [];
        const createdSelected = activeFilters.created || [];

        const matchesStatus = statusSelected.length === 0 || statusSelected.includes(dept.status);
        const matchesOwner = ownerSelected.length === 0 || ownerSelected.includes(dept.owner?.full_name);
        const matchesCreated = createdSelected.length === 0 || createdSelected.includes(getCreatedBucket(dept.created_at));

        return matchesSearch && matchesStatus && matchesOwner && matchesCreated;
    });


    const createMutation = useMutation({
        mutationFn: createDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            setIsDeleteModalOpen(false);
            setDepartmentToDelete(null);
        },
    });

    const handleSubmit = (formData) => {
        if (selectedDepartment) {
            updateMutation.mutate({ id: selectedDepartment.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        setDepartmentToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (departmentToDelete) {
            deleteMutation.mutate(departmentToDelete);
        }
    };

    const canManageDepartments = !readOnly && (user?.role === 'owner' || user?.role === 'hr');

    if (isLoading) return <div className="flex justify-center items-center h-screen text-primary">Loading...</div>;
    if (isError) return <div className="flex justify-center items-center h-screen text-red-500">Error loading departments. Is backend running?</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <Breadcrumb items={[{ label: 'Departments' }]} />
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
                        <p className="text-gray-500 mt-1">Manage your organization's departments and teams.</p>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search by name, location, or owner..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm transition-all w-80 shadow-sm"
                            />
                        </div>

                        <div className="flex-shrink-0">
                            <FilterPanel
                                filters={filterConfig}
                                activeFilters={activeFilters}
                                onChange={(key, values) => setActiveFilters(prev => ({ ...prev, [key]: values }))}
                                onClear={() => setActiveFilters({})}
                            />
                        </div>

                        <div className="flex-shrink-0">
                            <ColumnSelector
                                columns={DEPARTMENT_COLUMNS}
                                visibleColumns={visibleColumns}
                                onToggle={(id) => {
                                    const col = DEPARTMENT_COLUMNS.find(c => c.id === id);
                                    if (col && col.required) return;
                                    toggleColumn(id);
                                }}
                            />
                        </div>
                    </div>
                </div>

                {filteredDepartments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="text-grey mb-4">No departments found.</div>
                        {canManageDepartments && (
                            <button onClick={openCreateModal} className="text-[#00C853] hover:underline">Create your first department</button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                            <RoleGuard allowedRoles={readOnly ? [] : ['hr', 'owner']}>
                                <button
                                    onClick={openCreateModal}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    + Add Department
                                </button>
                            </RoleGuard>
                            <div className="text-sm text-gray-500">
                                Results: <span className="font-semibold text-gray-700">{filteredDepartments.length}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto min-h-[500px]">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                                        {visibleColumns.includes('name') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Department Name</th>}
                                        {visibleColumns.includes('job_count') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Job Count</th>}
                                        {visibleColumns.includes('location') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Department Location</th>}
                                        {visibleColumns.includes('status') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Department Status</th>}
                                        {visibleColumns.includes('owner') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Department Owner</th>}
                                        {visibleColumns.includes('created_at') && <th className="px-4 py-4 cursor-pointer hover:bg-gray-50">Department Created</th>}
                                        {canManageDepartments && (
                                            <th className="px-4 py-4 w-10"></th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                                    {filteredDepartments.map((dept, index) => {
                                        const isEven = index % 2 === 0;
                                        return (
                                            <tr key={dept.id} className={`hover:bg-gray-50 transition-colors group ${isEven ? 'bg-white' : 'bg-[#fafafa]'}`}>
                                                {visibleColumns.includes('name') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 text-primary font-bold text-xs">
                                                                {dept.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="ml-3">
                                                                <div
                                                                    className="text-[13px] font-medium text-indigo-600 hover:text-indigo-900 cursor-pointer hover:underline"
                                                                    onClick={() => navigate(`/departments/${dept.id}`)}
                                                                >
                                                                    {dept.name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('job_count') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="text-[13px] text-gray-900">{dept.total_jobs_count || 0}</div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('location') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="text-[13px] text-gray-600">{dept.location || "Lahore, Punjab, Pakistan"}</div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('status') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dept.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {dept.status || 'Active'}
                                                        </span>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('owner') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {dept.owner ? (
                                                                <>
                                                                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 mr-2 font-bold">
                                                                        {dept.owner.full_name.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="text-[13px] text-gray-900">{dept.owner.full_name}</div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 mr-2">OA</div>
                                                                    <div className="text-[13px] text-gray-500">Unassigned</div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.includes('created_at') && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-gray-600">
                                                        {new Date(dept.created_at).toLocaleDateString()}
                                                    </td>
                                                )}
                                                {canManageDepartments && (
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                                                        <ActionMenu
                                                            actions={[
                                                                { label: 'Edit', icon: <Edit size={16} />, onClick: () => openEditModal(dept) },
                                                                { label: 'Delete', icon: <Trash2 size={16} />, onClick: () => handleDelete(dept.id), className: 'text-red-600 hover:text-red-700' }
                                                            ]}
                                                        />
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <DepartmentModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    initialData={selectedDepartment}
                />

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Department"
                    message="Are you sure you want to delete this department? This action cannot be undone."
                    confirmText="Delete"
                    confirmStyle="danger"
                />
            </div>
        </div>
    );
};

export default DepartmentsPage;
