import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScorecardModal from '../components/ScorecardModal';
import * as feedbacksApi from '../api/feedbacks';

// Mock the feedbacks API
vi.mock('../api/feedbacks', () => ({
    createFeedback: vi.fn(),
}));

describe('ScorecardModal Integration Test', () => {
    const mockActivity = {
        id: 'act-123',
        candidate_id: 'cand-456',
        title: 'Initial Technical Interview',
        candidate: {
            first_name: 'John',
            last_name: 'Doe'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits successfully when assigned user inputs valid feedback', async () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();
        feedbacksApi.createFeedback.mockResolvedValueOnce({ id: 'feedback-1' });

        await act(async () => {
            render(
                <ScorecardModal
                    isOpen={true}
                    onClose={onCloseMock}
                    activity={mockActivity}
                    onSave={onSaveMock}
                />
            );
        });

        // Setup some score inputs
        const score4Button = screen.getAllByRole('button', { name: '4' })[0]; // First criteria score
        await act(async () => {
            fireEvent.click(score4Button);
        });

        const overall5Button = screen.getAllByRole('button', { name: '5' })[5]; // Overall score button block
        await act(async () => {
            fireEvent.click(overall5Button);
        });

        const recommendationButton = screen.getByRole('button', { name: 'Strong Yes' });
        await act(async () => {
            fireEvent.click(recommendationButton);
        });

        const submitButton = screen.getByRole('button', { name: 'Submit Scorecard' });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify the API call and lifecycle functions
        expect(feedbacksApi.createFeedback).toHaveBeenCalledTimes(1);
        expect(feedbacksApi.createFeedback).toHaveBeenCalledWith(expect.objectContaining({
            activity_id: 'act-123',
            candidate_id: 'cand-456',
            overall_score: 5,
            recommendation: 'Strong Yes',
        }));

        expect(onSaveMock).toHaveBeenCalledTimes(1);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Only assigned user/i)).not.toBeInTheDocument();
    });

    it('displays error and does not save when unauthorized user tries to submit', async () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        const mockErrorResponse = {
            response: {
                data: {
                    detail: "Only assigned user can submit feedback"
                }
            }
        };

        feedbacksApi.createFeedback.mockRejectedValueOnce(mockErrorResponse);

        await act(async () => {
            render(
                <ScorecardModal
                    isOpen={true}
                    onClose={onCloseMock}
                    activity={mockActivity}
                    onSave={onSaveMock}
                />
            );
        });

        const overall3Button = screen.getAllByRole('button', { name: '3' })[5];
        await act(async () => {
            fireEvent.click(overall3Button);
        });

        const recommendationButton = screen.getByRole('button', { name: 'No' });
        await act(async () => {
            fireEvent.click(recommendationButton);
        });

        const submitButton = screen.getByRole('button', { name: 'Submit Scorecard' });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify the API call but rejected
        expect(feedbacksApi.createFeedback).toHaveBeenCalledTimes(1);

        // Verification: The component should NOT call `onSave` or `onClose`
        expect(onSaveMock).not.toHaveBeenCalled();
        expect(onCloseMock).not.toHaveBeenCalled();

        // Verification: The rendered text shows the backend error properly
        expect(await screen.findByText('Only assigned user can submit feedback')).toBeInTheDocument();
    });
});
