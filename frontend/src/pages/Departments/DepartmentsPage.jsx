import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Columns, Edit, Trash2 } from 'lucide-react';

import ActionMenu from '../../components/ActionMenu';

import DepartmentModal from '../../components/DepartmentModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import useDepartmentStore from '../../store/useDepartmentStore';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments';
import { useAuth } from '../../context/AuthContext';
import Breadcrumb from '../../components/Breadcrumb';
import ColumnSelector from '../../components/ColumnSelector';
import useColumnPersistence from '../../hooks/useColumnPersistence';

const DEPARTMENT_COLUMNS = [
    { id: 'name', label: 'Department Name', required: true },
    { id: 'job_count', label: 'Job Count' },
    { id: 'location', label: 'Department Location' },
    { id: 'status', label: 'Department Status' },
    { id: 'owner', label: 'Department Owner' },
    { id: 'type', label: 'Department Type' },
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
    const [inputValue, setInputValue] = useState('');

    const [visibleColumns, toggleColumn] = useColumnPersistence('clustox_departments_columns', DEPARTMENT_COLUMNS.map(c => c.id));

    const handleSearch = () => {
        setSearchQuery(inputValue);
    };

    const { data: departments, isLoading, isError } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    });

    // Filter departments based on search query
    const filteredDepartments = (departments || []).filter(dept => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const name = (dept.name || '').toLowerCase();
        const location = (dept.location || '').toLowerCase();
        const owner = (dept.owner?.full_name || '').toLowerCase();
        return name.includes(query) || location.includes(query) || owner.includes(query);
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
                        <h1 className="text-3xl font-bold text-dark mb-2">Departments</h1>
                        <p className="text-grey">Manage your organization's departments and teams.</p>
                    </div>
                    {canManageDepartments && (
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">Add Department</span>
                        </button>
                    )}
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search departments by name, location, or owner..."
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

                {filteredDepartments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="text-grey mb-4">No departments found.</div>
                        {canManageDepartments && (
                            <button onClick={openCreateModal} className="text-primary hover:underline">Create your first department</button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {visibleColumns.includes('name') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Name</th>}
                                        {visibleColumns.includes('job_count') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Count</th>}
                                        {visibleColumns.includes('location') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Location</th>}
                                        {visibleColumns.includes('status') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Status</th>}
                                        {visibleColumns.includes('owner') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Owner</th>}
                                        {visibleColumns.includes('type') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Type</th>}
                                        {visibleColumns.includes('created_at') && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Created</th>}
                                        {canManageDepartments && (
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredDepartments.map((dept) => (
                                        <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                                            {visibleColumns.includes('name') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-primary font-bold">
                                                            {dept.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div
                                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-900 cursor-pointer hover:underline"
                                                                onClick={() => navigate(`/departments/${dept.id}`)}
                                                            >
                                                                {dept.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('job_count') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{dept.total_jobs_count || 0}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('location') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">{dept.location || "Lahore, Punjab, Pakistan"}</div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('status') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dept.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {dept.status || 'Active'}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.includes('owner') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {dept.owner ? (
                                                            <>
                                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 mr-2 font-bold">
                                                                    {dept.owner.full_name.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="text-sm text-gray-900">{dept.owner.full_name}</div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 mr-2">OA</div>
                                                                <div className="text-sm text-gray-500">Unassigned</div>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('type') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    Department
                                                </td>
                                            )}
                                            {visibleColumns.includes('created_at') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(dept.created_at).toLocaleDateString()}
                                                </td>
                                            )}
                                            {canManageDepartments && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <ActionMenu
                                                        actions={[
                                                            { label: 'Edit', icon: <Edit size={16} />, onClick: () => openEditModal(dept) },
                                                            { label: 'Delete', icon: <Trash2 size={16} />, onClick: () => handleDelete(dept.id), className: 'text-red-600 hover:text-red-700' }
                                                        ]}
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
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
