import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CandidateScorecards from '../components/CandidateScorecards';
import * as feedbacksApi from '../api/feedbacks';

vi.mock('../api/feedbacks');

describe('CandidateScorecards Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        feedbacksApi.getCandidateFeedbacks.mockReturnValue(new Promise(() => {})); // Never resolves

        render(<CandidateScorecards candidateId="cand-123" />);

        expect(screen.getByText('Loading scorecards...')).toBeInTheDocument();
    });

    it('shows empty state when no feedbacks exist', async () => {
        feedbacksApi.getCandidateFeedbacks.mockResolvedValue([]);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('No scorecards submitted for this candidate yet.')).toBeInTheDocument();
        });
    });

    it('renders feedbacks successfully', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 5,
                recommendation: 'Strong Yes',
                interviewer: {
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@example.com'
                },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: [
                    { criteria: 'Technical Skills', score: 5, comment: 'Excellent' },
                    { criteria: 'Communication', score: 4, comment: '' }
                ],
                comments: 'Great candidate overall'
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('Overall Score: 5/5')).toBeInTheDocument();
            expect(screen.getByText('Recommendation: Strong Yes')).toBeInTheDocument();
            expect(screen.getByText('by John Doe')).toBeInTheDocument();
            expect(screen.getByText('Technical Skills')).toBeInTheDocument();
            expect(screen.getByText('"Excellent"')).toBeInTheDocument();
            expect(screen.getByText('Communication')).toBeInTheDocument();
            expect(screen.getByText('"Great candidate overall"')).toBeInTheDocument();
        });
    });

    it('displays recommendation with green color for "Yes" recommendations', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 4,
                recommendation: 'Yes',
                interviewer: { first_name: 'Jane', last_name: 'Smith' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        const { container } = render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            const recommendation = screen.getByText('Recommendation: Yes');
            expect(recommendation).toHaveClass('text-green-600');
        });
    });

    it('displays recommendation with red color for "No" recommendations', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 2,
                recommendation: 'No',
                interviewer: { first_name: 'Jane', last_name: 'Smith' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            const recommendation = screen.getByText('Recommendation: No');
            expect(recommendation).toHaveClass('text-red-600');
        });
    });

    it('displays interviewer email when first_name and last_name are missing', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 3,
                recommendation: 'Maybe',
                interviewer: { email: 'interviewer@example.com' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('by interviewer@example.com')).toBeInTheDocument();
        });
    });

    it('displays "Unknown Interviewer" when interviewer data is missing', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 3,
                recommendation: 'Maybe',
                interviewer: null,
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('by Unknown Interviewer')).toBeInTheDocument();
        });
    });

    it('displays "Unknown Interviewer" when interviewer has no email', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 3,
                recommendation: 'Maybe',
                interviewer: {},
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('by Unknown Interviewer')).toBeInTheDocument();
        });
    });

    it('renders scorecard items without comments', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 4,
                recommendation: 'Yes',
                interviewer: { first_name: 'Test', last_name: 'User' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: [
                    { criteria: 'Problem Solving', score: 5, comment: null }
                ]
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('Problem Solving')).toBeInTheDocument();
            expect(screen.queryByText(/"/)).not.toBeInTheDocument();
        });
    });

    it('does not render comments section when feedback.comments is null', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 4,
                recommendation: 'Yes',
                interviewer: { first_name: 'Test', last_name: 'User' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: [],
                comments: null
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.queryByText('Interviewer Summary')).not.toBeInTheDocument();
        });
    });

    it('renders stars correctly based on score', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 3,
                recommendation: 'Yes',
                interviewer: { first_name: 'Test', last_name: 'User' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: [
                    { criteria: 'Test Criteria', score: 3, comment: '' }
                ]
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        const { container } = render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            const filledStars = container.querySelectorAll('.fill-yellow-400');
            const unfilledStars = container.querySelectorAll('.text-gray-200');

            expect(filledStars.length).toBe(3);
            expect(unfilledStars.length).toBe(2);
        });
    });

    it('formats date correctly', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 4,
                recommendation: 'Yes',
                interviewer: { first_name: 'Test', last_name: 'User' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            // Date format may vary by locale, so just check it's present
            const dateElement = screen.getByText(/1\/15\/2024|15\/1\/2024|2024/);
            expect(dateElement).toBeInTheDocument();
        });
    });

    it('handles API errors gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('API Error');
        feedbacksApi.getCandidateFeedbacks.mockRejectedValue(error);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch feedbacks', error);
            expect(screen.getByText('No scorecards submitted for this candidate yet.')).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
    });

    it('renders multiple feedbacks', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 5,
                recommendation: 'Strong Yes',
                interviewer: { first_name: 'John', last_name: 'Doe' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: []
            },
            {
                id: 'fb-2',
                overall_score: 4,
                recommendation: 'Yes',
                interviewer: { first_name: 'Jane', last_name: 'Smith' },
                created_at: '2024-01-16T10:00:00Z',
                scorecard: []
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('by John Doe')).toBeInTheDocument();
            expect(screen.getByText('by Jane Smith')).toBeInTheDocument();
        });
    });

    it('handles empty scorecard array', async () => {
        const mockFeedbacks = [
            {
                id: 'fb-1',
                overall_score: 4,
                recommendation: 'Yes',
                interviewer: { first_name: 'Test', last_name: 'User' },
                created_at: '2024-01-15T10:00:00Z',
                scorecard: null
            }
        ];

        feedbacksApi.getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        render(<CandidateScorecards candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('Overall Score: 4/5')).toBeInTheDocument();
        });
    });

    it('calls getCandidateFeedbacks with correct candidateId', async () => {
        feedbacksApi.getCandidateFeedbacks.mockResolvedValue([]);

        render(<CandidateScorecards candidateId="test-candidate-456" />);

        await waitFor(() => {
            expect(feedbacksApi.getCandidateFeedbacks).toHaveBeenCalledWith('test-candidate-456');
        });
    });
});
