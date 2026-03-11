import { describe, it, expect, beforeEach } from 'vitest';
import useDepartmentStore from '../store/useDepartmentStore';

describe('useDepartmentStore', () => {
    beforeEach(() => {
        // Reset the store state before each test
        const initialState = useDepartmentStore.getInitialState();
        useDepartmentStore.setState(initialState, true);
    });

    it('has the correct initial state', () => {
        const state = useDepartmentStore.getState();
        expect(state.isModalOpen).toBe(false);
        expect(state.selectedDepartment).toBeNull();
    });

    it('openCreateModal sets isModalOpen to true and clears selectedDepartment', () => {
        // Pre-set some state to ensure it gets cleared
        useDepartmentStore.setState({ selectedDepartment: { id: 1 } });

        useDepartmentStore.getState().openCreateModal();

        const state = useDepartmentStore.getState();
        expect(state.isModalOpen).toBe(true);
        expect(state.selectedDepartment).toBeNull();
    });

    it('openEditModal sets isModalOpen to true and sets the selectedDepartment', () => {
        const mockDepartment = { id: 1, name: 'HR' };

        useDepartmentStore.getState().openEditModal(mockDepartment);

        const state = useDepartmentStore.getState();
        expect(state.isModalOpen).toBe(true);
        expect(state.selectedDepartment).toEqual(mockDepartment);
    });

    it('closeModal sets isModalOpen to false and clears selectedDepartment', () => {
        // Pre-set open state
        useDepartmentStore.setState({ isModalOpen: true, selectedDepartment: { id: 1 } });

        useDepartmentStore.getState().closeModal();

        const state = useDepartmentStore.getState();
        expect(state.isModalOpen).toBe(false);
        expect(state.selectedDepartment).toBeNull();
    });
});
