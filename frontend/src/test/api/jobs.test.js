import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from '../../api/client';
import {
    getJobs,
    getJob,
    createJob,
    updateJob,
    cloneJob,
    updatePipeline,
    deleteJob,
    permanentlyDeleteJob,
    updateCandidateStage,
    updateCandidateScore,
    screenCandidate,
    syncPipelineFromTemplate,
    changePipelineTemplate
} from '../../api/jobs';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('Jobs API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockData = { id: 1, title: 'Engineer' };

    describe('getJobs', () => {
        it('calls client.get with correct url and no params', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getJobs();
            expect(client.get).toHaveBeenCalledWith('/jobs', { params: {} });
            expect(result).toEqual([mockData]);
        });

        it('calls client.get with departmentId param', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getJobs(2);
            expect(client.get).toHaveBeenCalledWith('/jobs', { params: { department_id: 2 } });
            expect(result).toEqual([mockData]);
        });

        it('calls client.get with status param', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getJobs(null, 'Published');
            expect(client.get).toHaveBeenCalledWith('/jobs', { params: { status: 'Published' } });
            expect(result).toEqual([mockData]);
        });

        it('calls client.get with both params', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getJobs(2, 'Published');
            expect(client.get).toHaveBeenCalledWith('/jobs', { params: { department_id: 2, status: 'Published' } });
            expect(result).toEqual([mockData]);
        });
    });

    describe('getJob', () => {
        it('calls client.get with correct url', async () => {
            client.get.mockResolvedValueOnce({ data: mockData });
            const result = await getJob(1);
            expect(client.get).toHaveBeenCalledWith('/jobs/1');
            expect(result).toEqual(mockData);
        });
    });

    describe('createJob', () => {
        it('calls client.post with correct url and payload', async () => {
            client.post.mockResolvedValueOnce({ data: mockData });
            const payload = { title: 'Engineer' };
            const result = await createJob(payload);
            expect(client.post).toHaveBeenCalledWith('/jobs', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('updateJob', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: mockData });
            const payload = { title: 'Updated' };
            const result = await updateJob(1, payload);
            expect(client.put).toHaveBeenCalledWith('/jobs/1', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('cloneJob', () => {
        it('calls client.post with correct url', async () => {
            client.post.mockResolvedValueOnce({ data: mockData });
            const result = await cloneJob(1);
            expect(client.post).toHaveBeenCalledWith('/jobs/1/clone');
            expect(result).toEqual(mockData);
        });
    });

    describe('updatePipeline', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: { success: true } });
            const payload = { stages: [] };
            const result = await updatePipeline(1, payload);
            expect(client.put).toHaveBeenCalledWith('/jobs/1/pipeline', payload);
            expect(result).toEqual({ success: true });
        });
    });

    describe('deleteJob', () => {
        it('calls client.delete with correct url', async () => {
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            const result = await deleteJob(1);
            expect(client.delete).toHaveBeenCalledWith('/jobs/1');
            expect(result).toEqual({ success: true });
        });
    });

    describe('permanentlyDeleteJob', () => {
        it('calls client.delete with correct url', async () => {
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            const result = await permanentlyDeleteJob(1);
            expect(client.delete).toHaveBeenCalledWith('/jobs/1/permanent');
            expect(result).toEqual({ success: true });
        });
    });

    describe('updateCandidateStage', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: { success: true } });
            const result = await updateCandidateStage(1, 2, 'Hired');
            expect(client.put).toHaveBeenCalledWith('/jobs/1/candidates/2/stage', { stage: 'Hired' });
            expect(result).toEqual({ success: true });
        });
    });

    describe('updateCandidateScore', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: { success: true } });
            const payload = { score: 5 };
            const result = await updateCandidateScore(1, 2, payload);
            expect(client.put).toHaveBeenCalledWith('/jobs/1/candidates/2/score', payload);
            expect(result).toEqual({ success: true });
        });
    });

    describe('screenCandidate', () => {
        it('calls client.post with correct url', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await screenCandidate(1, 2);
            expect(client.post).toHaveBeenCalledWith('/jobs/1/candidates/2/screen');
            expect(result).toEqual({ success: true });
        });
    });

    describe('syncPipelineFromTemplate', () => {
        it('calls client.post with correct url', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const result = await syncPipelineFromTemplate(1);
            expect(client.post).toHaveBeenCalledWith('/jobs/1/pipeline/sync');
            expect(result).toEqual({ success: true });
        });
    });

    describe('changePipelineTemplate', () => {
        it('calls client.patch with correct url and payload', async () => {
            client.patch.mockResolvedValueOnce({ data: { success: true } });
            const result = await changePipelineTemplate(1, 2);
            expect(client.patch).toHaveBeenCalledWith('/jobs/1/pipeline/template', { pipeline_template_id: 2 });
            expect(result).toEqual({ success: true });
        });
    });
});
