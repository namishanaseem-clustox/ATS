import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from '../../api/client';
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    removeMemberFromDepartment,
    getDepartmentMembers
} from '../../api/departments';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('Departments API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockData = { id: 1, name: 'Engineering' };

    describe('getDepartments', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getDepartments();
            expect(client.get).toHaveBeenCalledWith('/departments');
            expect(result).toEqual([mockData]);
        });
    });

    describe('createDepartment', () => {
        it('calls client.post with correct url and payload', async () => {
            client.post.mockResolvedValueOnce({ data: mockData });
            const payload = { name: 'Engineering' };
            const result = await createDepartment(payload);
            expect(client.post).toHaveBeenCalledWith('/departments', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('updateDepartment', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: mockData });
            const payload = { id: 1, name: 'Engineering' };
            const result = await updateDepartment(payload);
            expect(client.put).toHaveBeenCalledWith('/departments/1', { name: 'Engineering' });
            expect(result).toEqual(mockData);
        });
    });

    describe('deleteDepartment', () => {
        it('calls client.delete with correct url', async () => {
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            const result = await deleteDepartment(1);
            expect(client.delete).toHaveBeenCalledWith('/departments/1');
            expect(result).toEqual({ success: true });
        });
    });

    describe('removeMemberFromDepartment', () => {
        it('calls client.delete with correct url', async () => {
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            const result = await removeMemberFromDepartment(1, 42);
            expect(client.delete).toHaveBeenCalledWith('/departments/1/members/42');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getDepartmentMembers', () => {
        it('calls client.get with correct url', async () => {
            client.get.mockResolvedValueOnce({ data: [{ id: 42, name: 'John Doe' }] });
            const result = await getDepartmentMembers(1);
            expect(client.get).toHaveBeenCalledWith('/departments/1/members');
            expect(result).toEqual([{ id: 42, name: 'John Doe' }]);
        });
    });
});
