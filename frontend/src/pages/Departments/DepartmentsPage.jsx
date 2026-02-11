import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DepartmentCard from '../../components/DepartmentCard';
import DepartmentModal from '../../components/DepartmentModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import useDepartmentStore from '../../store/useDepartmentStore';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments';

const DepartmentsPage = () => {
    const queryClient = useQueryClient();
    const {
        isModalOpen,
        selectedDepartment,
        openCreateModal,
        openEditModal,
        closeModal
    } = useDepartmentStore();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState(null);

    const { data: departments, isLoading, isError } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
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

    if (isLoading) return <div className="flex justify-center items-center h-screen text-primary">Loading...</div>;
    if (isError) return <div className="flex justify-center items-center h-screen text-red-500">Error loading departments. Is backend running?</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-dark mb-2">Departments</h1>
                        <p className="text-grey">Manage your organization's departments and teams.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add Department</span>
                    </button>
                </div>

                {departments?.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="text-grey mb-4">No departments found.</div>
                        <button onClick={openCreateModal} className="text-primary hover:underline">Create your first department</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departments?.map((dept) => (
                            <DepartmentCard
                                key={dept.id}
                                department={dept}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                            />
                        ))}
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
