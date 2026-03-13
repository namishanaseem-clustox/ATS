import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCandidateFeedbacks, createFeedback, getFeedback } from '../../api/feedbacks';
import client from '../../api/client';

vi.mock('../../api/client');

describe('Feedbacks API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCandidateFeedbacks', () => {
        it('fetches feedbacks for a candidate successfully', async () => {
            const mockData = [
                { id: 'f1', overall_score: 5, recommendation: 'Strong Yes' },
                { id: 'f2', overall_score: 3, recommendation: 'No' }
            ];
            client.get.mockResolvedValue({ data: mockData });

            const result = await getCandidateFeedbacks('candidate-123');

            expect(client.get).toHaveBeenCalledWith('/feedbacks/candidate/candidate-123/');
            expect(result).toEqual(mockData);
        });

        it('propagates errors when fetching candidate feedbacks fails', async () => {
            const error = new Error('Network error');
            client.get.mockRejectedValue(error);

            await expect(getCandidateFeedbacks('candidate-123')).rejects.toThrow('Network error');
            expect(client.get).toHaveBeenCalledWith('/feedbacks/candidate/candidate-123/');
        });
    });

    describe('createFeedback', () => {
        it('creates a feedback successfully', async () => {
            const feedbackData = {
                activity_id: 'act-1',
                candidate_id: 'cand-1',
                overall_score: 4,
                recommendation: 'Yes',
                scorecard: [],
                comments: 'Good candidate'
            };
            const mockResponse = { id: 'fb-1', ...feedbackData };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await createFeedback(feedbackData);

            expect(client.post).toHaveBeenCalledWith('/feedbacks/', feedbackData);
            expect(result).toEqual(mockResponse);
        });

        it('propagates errors when creating feedback fails', async () => {
            const feedbackData = { overall_score: 5 };
            const error = new Error('Validation error');
            client.post.mockRejectedValue(error);

            await expect(createFeedback(feedbackData)).rejects.toThrow('Validation error');
            expect(client.post).toHaveBeenCalledWith('/feedbacks/', feedbackData);
        });
    });

    describe('getFeedback', () => {
        it('fetches a single feedback by ID successfully', async () => {
            const mockData = { id: 'fb-1', overall_score: 5, comments: 'Excellent' };
            client.get.mockResolvedValue({ data: mockData });

            const result = await getFeedback('fb-1');

            expect(client.get).toHaveBeenCalledWith('/feedbacks/fb-1/');
            expect(result).toEqual(mockData);
        });

        it('propagates errors when fetching feedback fails', async () => {
            const error = new Error('Not found');
            client.get.mockRejectedValue(error);

            await expect(getFeedback('fb-999')).rejects.toThrow('Not found');
            expect(client.get).toHaveBeenCalledWith('/feedbacks/fb-999/');
        });
    });
});
