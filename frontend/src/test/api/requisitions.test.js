import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '../../api/client';
import {
    getRequisitions,
    getRequisition,
    createRequisition,
    updateRequisition,
    submitRequisition,
    approveRequisition,
    rejectRequisition,
    convertRequisitionToJob
} from '../../api/requisitions';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    }
}));

describe('Requisitions API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockData = { id: 1, title: 'Requisition 1' };

    describe('getRequisitions', () => {
        it('calls axiosInstance.get with correct url and returns data', async () => {
            axiosInstance.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getRequisitions();
            expect(axiosInstance.get).toHaveBeenCalledWith('/requisitions/');
            expect(result).toEqual([mockData]);
        });
    });

    describe('getRequisition', () => {
        it('calls axiosInstance.get with correct url and returns data', async () => {
            axiosInstance.get.mockResolvedValueOnce({ data: mockData });
            const result = await getRequisition(1);
            expect(axiosInstance.get).toHaveBeenCalledWith('/requisitions/1');
            expect(result).toEqual(mockData);
        });
    });

    describe('createRequisition', () => {
        it('calls axiosInstance.post with correct url and payload', async () => {
            axiosInstance.post.mockResolvedValueOnce({ data: mockData });
            const payload = { title: 'Requisition 1' };
            const result = await createRequisition(payload);
            expect(axiosInstance.post).toHaveBeenCalledWith('/requisitions/', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('updateRequisition', () => {
        it('calls axiosInstance.put with correct url and payload', async () => {
            axiosInstance.put.mockResolvedValueOnce({ data: mockData });
            const payload = { title: 'Updated' };
            const result = await updateRequisition(1, payload);
            expect(axiosInstance.put).toHaveBeenCalledWith('/requisitions/1', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('submitRequisition', () => {
        it('calls axiosInstance.post with correct url', async () => {
            axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await submitRequisition(1);
            expect(axiosInstance.post).toHaveBeenCalledWith('/requisitions/1/submit');
            expect(result).toEqual({ success: true });
        });
    });

    describe('approveRequisition', () => {
        it('calls axiosInstance.post with correct url', async () => {
            axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await approveRequisition(1);
            expect(axiosInstance.post).toHaveBeenCalledWith('/requisitions/1/approve');
            expect(result).toEqual({ success: true });
        });
    });

    describe('rejectRequisition', () => {
        it('calls axiosInstance.post with correct url and reason payload', async () => {
            axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await rejectRequisition(1, 'Budget cuts');
            expect(axiosInstance.post).toHaveBeenCalledWith('/requisitions/1/reject', { reason: 'Budget cuts' });
            expect(result).toEqual({ success: true });
        });
    });

    describe('convertRequisitionToJob', () => {
        it('calls axiosInstance.post with correct url', async () => {
            axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await convertRequisitionToJob(1);
            expect(axiosInstance.post).toHaveBeenCalledWith('/requisitions/1/convert');
            expect(result).toEqual({ success: true });
        });
    });
});
