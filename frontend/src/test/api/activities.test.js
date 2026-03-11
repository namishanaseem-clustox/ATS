import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from '../../api/client';
import {
    getJobActivities,
    getCandidateActivities,
    getActivity,
    createActivity,
    updateActivity,
    deleteActivity,
    getMyInterviews,
    getAllActivities
} from '../../api/activities';

// Mock the API client
vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('Activities API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockData = { id: 1, name: 'Test Activity' };

    describe('getJobActivities', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getJobActivities('job-123');
            expect(client.get).toHaveBeenCalledWith('/activities/job/job-123/');
            expect(result).toEqual([mockData]);
        });

        it('throws an error if client.get fails', async () => {
            const error = new Error('Network error');
            client.get.mockRejectedValueOnce(error);
            await expect(getJobActivities('job-123')).rejects.toThrow('Network error');
        });
    });

    describe('getCandidateActivities', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getCandidateActivities('cand-123');
            expect(client.get).toHaveBeenCalledWith('/activities/candidate/cand-123/');
            expect(result).toEqual([mockData]);
        });
    });

    describe('getActivity', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: mockData });
            const result = await getActivity('act-123');
            expect(client.get).toHaveBeenCalledWith('/activities/act-123/');
            expect(result).toEqual(mockData);
        });
    });

    describe('createActivity', () => {
        it('calls client.post with correct url and payload', async () => {
            client.post.mockResolvedValueOnce({ data: mockData });
            const payload = { title: 'New Activity' };
            const result = await createActivity(payload);
            expect(client.post).toHaveBeenCalledWith('/activities/', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('updateActivity', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: mockData });
            const payload = { title: 'Updated' };
            const result = await updateActivity('act-123', payload);
            expect(client.put).toHaveBeenCalledWith('/activities/act-123/', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('deleteActivity', () => {
        it('calls client.delete with correct url', async () => {
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            const result = await deleteActivity('act-123');
            expect(client.delete).toHaveBeenCalledWith('/activities/act-123/');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getMyInterviews', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getMyInterviews();
            expect(client.get).toHaveBeenCalledWith('/activities/my-interviews/');
            expect(result).toEqual([mockData]);
        });
    });

    describe('getAllActivities', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getAllActivities();
            expect(client.get).toHaveBeenCalledWith('/activities/all/');
            expect(result).toEqual([mockData]);
        });
    });
});
