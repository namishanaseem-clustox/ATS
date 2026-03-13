import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getPipelineTemplates,
    createPipelineTemplate,
    updatePipelineTemplate,
    deletePipelineTemplate,
    getPipelineStages,
    createPipelineStage,
    updatePipelineStage,
    deletePipelineStage
} from '../../api/pipeline';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

import client from '../../api/client';

describe('Pipeline API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- Templates ---
    describe('getPipelineTemplates', () => {
        it('fetches pipeline templates successfully', async () => {
            const mockData = [{ id: 't1', name: 'Standard' }];
            client.get.mockResolvedValue({ data: mockData });

            const result = await getPipelineTemplates();

            expect(client.get).toHaveBeenCalledWith('/pipeline/templates');
            expect(result).toEqual(mockData);
        });

        it('propagates errors', async () => {
            const error = new Error('Network error');
            client.get.mockRejectedValue(error);

            await expect(getPipelineTemplates()).rejects.toThrow('Network error');
        });
    });

    describe('createPipelineTemplate', () => {
        it('creates a pipeline template successfully', async () => {
            const templateData = { name: 'New Template' };
            const mockResponse = { id: 't2', ...templateData };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await createPipelineTemplate(templateData);

            expect(client.post).toHaveBeenCalledWith('/pipeline/templates', templateData);
            expect(result).toEqual(mockResponse);
        });

        it('propagates errors', async () => {
            const error = new Error('Create failed');
            client.post.mockRejectedValue(error);

            await expect(createPipelineTemplate({})).rejects.toThrow('Create failed');
        });
    });

    describe('updatePipelineTemplate', () => {
        it('updates a pipeline template successfully', async () => {
            const id = 't1';
            const templateData = { name: 'Updated Template' };
            const mockResponse = { id, ...templateData };
            client.put.mockResolvedValue({ data: mockResponse });

            const result = await updatePipelineTemplate(id, templateData);

            expect(client.put).toHaveBeenCalledWith(`/pipeline/templates/${id}`, templateData);
            expect(result).toEqual(mockResponse);
        });

        it('propagates errors', async () => {
            const error = new Error('Update failed');
            client.put.mockRejectedValue(error);

            await expect(updatePipelineTemplate('t1', {})).rejects.toThrow('Update failed');
        });
    });

    describe('deletePipelineTemplate', () => {
        it('deletes a pipeline template successfully', async () => {
            const id = 't1';
            client.delete.mockResolvedValue({});

            await deletePipelineTemplate(id);

            expect(client.delete).toHaveBeenCalledWith(`/pipeline/templates/${id}`);
        });

        it('propagates errors', async () => {
            const error = new Error('Delete failed');
            client.delete.mockRejectedValue(error);

            await expect(deletePipelineTemplate('t1')).rejects.toThrow('Delete failed');
        });
    });

    // --- Stages ---
    describe('getPipelineStages', () => {
        it('fetches stages without templateId', async () => {
            const mockData = [{ id: 's1', name: 'Applied' }];
            client.get.mockResolvedValue({ data: mockData });

            const result = await getPipelineStages();

            expect(client.get).toHaveBeenCalledWith('/pipeline/stages', { params: {} });
            expect(result).toEqual(mockData);
        });

        it('fetches stages with templateId', async () => {
            const mockData = [{ id: 's1', name: 'Applied' }];
            const templateId = 't1';
            client.get.mockResolvedValue({ data: mockData });

            const result = await getPipelineStages(templateId);

            expect(client.get).toHaveBeenCalledWith('/pipeline/stages', { params: { template_id: templateId } });
            expect(result).toEqual(mockData);
        });

        it('handles null templateId', async () => {
            const mockData = [{ id: 's1', name: 'Applied' }];
            client.get.mockResolvedValue({ data: mockData });

            const result = await getPipelineStages(null);

            expect(client.get).toHaveBeenCalledWith('/pipeline/stages', { params: {} });
            expect(result).toEqual(mockData);
        });

        it('propagates errors', async () => {
            const error = new Error('Fetch failed');
            client.get.mockRejectedValue(error);

            await expect(getPipelineStages()).rejects.toThrow('Fetch failed');
        });
    });

    describe('createPipelineStage', () => {
        it('creates a pipeline stage successfully', async () => {
            const stageData = { name: 'Interview', order: 2, pipeline_template_id: 't1' };
            const mockResponse = { id: 's2', ...stageData };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await createPipelineStage(stageData);

            expect(client.post).toHaveBeenCalledWith('/pipeline/stages', stageData);
            expect(result).toEqual(mockResponse);
        });

        it('propagates errors', async () => {
            const error = new Error('Create failed');
            client.post.mockRejectedValue(error);

            await expect(createPipelineStage({})).rejects.toThrow('Create failed');
        });
    });

    describe('updatePipelineStage', () => {
        it('updates a pipeline stage successfully', async () => {
            const id = 's1';
            const stageData = { name: 'Updated Stage', order: 3 };
            const mockResponse = { id, ...stageData };
            client.put.mockResolvedValue({ data: mockResponse });

            const result = await updatePipelineStage(id, stageData);

            expect(client.put).toHaveBeenCalledWith(`/pipeline/stages/${id}`, stageData);
            expect(result).toEqual(mockResponse);
        });

        it('propagates errors', async () => {
            const error = new Error('Update failed');
            client.put.mockRejectedValue(error);

            await expect(updatePipelineStage('s1', {})).rejects.toThrow('Update failed');
        });
    });

    describe('deletePipelineStage', () => {
        it('deletes a pipeline stage successfully', async () => {
            const id = 's1';
            client.delete.mockResolvedValue({});

            await deletePipelineStage(id);

            expect(client.delete).toHaveBeenCalledWith(`/pipeline/stages/${id}`);
        });

        it('propagates errors', async () => {
            const error = new Error('Delete failed');
            client.delete.mockRejectedValue(error);

            await expect(deletePipelineStage('s1')).rejects.toThrow('Delete failed');
        });
    });
});
