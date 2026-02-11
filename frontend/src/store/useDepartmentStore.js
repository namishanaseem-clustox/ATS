import { create } from 'zustand';

const useDepartmentStore = create((set) => ({
    isModalOpen: false,
    selectedDepartment: null,

    openCreateModal: () => set({ isModalOpen: true, selectedDepartment: null }),
    openEditModal: (department) => set({ isModalOpen: true, selectedDepartment: department }),
    closeModal: () => set({ isModalOpen: false, selectedDepartment: null }),
}));

export default useDepartmentStore;
