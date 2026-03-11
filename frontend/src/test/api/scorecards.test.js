import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from '../../api/client';
import {
    getScorecardTemplates,
    getScorecardTemplate,
    createScorecardTemplate,
    updateScorecardTemplate,
    deleteScorecardTemplate
} from '../../api/scorecards';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('Scorecards API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockData = { id: 1, name: 'Template 1' };

    describe('getScorecardTemplates', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: [mockData] });
            const result = await getScorecardTemplates();
            expect(client.get).toHaveBeenCalledWith('/scorecards/');
            expect(result).toEqual([mockData]);
        });
    });

    describe('getScorecardTemplate', () => {
        it('calls client.get with correct url and returns data', async () => {
            client.get.mockResolvedValueOnce({ data: mockData });
            const result = await getScorecardTemplate(1);
            expect(client.get).toHaveBeenCalledWith('/scorecards/1');
            expect(result).toEqual(mockData);
        });
    });

    describe('createScorecardTemplate', () => {
        it('calls client.post with correct url and payload', async () => {
            client.post.mockResolvedValueOnce({ data: mockData });
            const payload = { name: 'Template 1' };
            const result = await createScorecardTemplate(payload);
            expect(client.post).toHaveBeenCalledWith('/scorecards/', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('updateScorecardTemplate', () => {
        it('calls client.put with correct url and payload', async () => {
            client.put.mockResolvedValueOnce({ data: mockData });
            const payload = { name: 'Updated' };
            const result = await updateScorecardTemplate(1, payload);
            expect(client.put).toHaveBeenCalledWith('/scorecards/1', payload);
            expect(result).toEqual(mockData);
        });
    });

    describe('deleteScorecardTemplate', () => {
        it('calls client.delete with correct url', async () => {
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            const result = await deleteScorecardTemplate(1);
            expect(client.delete).toHaveBeenCalledWith('/scorecards/1');
            expect(result).toEqual({ success: true });
        });
    });
});
