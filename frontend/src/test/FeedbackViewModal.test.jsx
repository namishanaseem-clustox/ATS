import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FeedbackViewModal from '../components/FeedbackViewModal';
import * as authContext from '../context/AuthContext';
import { getCandidateFeedbacks } from '../api/feedbacks';

vi.mock('../api/feedbacks');
vi.mock('../context/AuthContext');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('FeedbackViewModal Component', () => {
    const mockCandidate = {
        id: 'cand-123',
        first_name: 'John',
        last_name: 'Doe',
        applications: [
            { job_id: 'job-456', job: { id: 'job-456' } }
        ]
    };

    const mockFeedbacks = [
        {
            id: 'fb1',
            overall_score: 5,
            recommendation: 'Strong Yes',
            created_at: '2024-01-15T10:00:00Z',
            interviewer: {
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane@example.com'
            },
            activity: {
                title: 'Technical Interview'
            },
            scorecard: [
                { criteria: 'Technical Skills', score: 5, comment: 'Excellent' },
                { criteria: 'Communication', score: 4, comment: 'Very good' }
            ],
            comments: 'Great candidate, highly recommended'
        },
        {
            id: 'fb2',
            overall_score: 3,
            recommendation: 'No',
            created_at: '2024-01-14T09:00:00Z',
            interviewer: {
                email: 'interviewer@example.com'
            },
            activity: {
                title: 'Phone Screen'
            },
            scorecard: [],
            comments: null
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        authContext.useAuth.mockReturnValue({
            user: { id: 'u1', role: 'hr' }
        });
    });

    const renderComponent = (props = {}) => {
        const defaultProps = {
            isOpen: true,
            onClose: vi.fn(),
            candidate: mockCandidate,
            ...props
        };

        return render(
            <MemoryRouter>
                <FeedbackViewModal {...defaultProps} />
            </MemoryRouter>
        );
    };

    it('does not render when isOpen is false', () => {
        const { container } = renderComponent({ isOpen: false });
        expect(container.firstChild).toBeNull();
    });

    it('fetches feedbacks when modal opens', async () => {
        getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        renderComponent();

        await waitFor(() => {
            expect(getCandidateFeedbacks).toHaveBeenCalledWith('cand-123');
        });
    });

    it('shows loading state while fetching', async () => {
        getCandidateFeedbacks.mockImplementation(() => new Promise(() => { }));

        const { container } = renderComponent();

        // Spinner is a plain div with animate-spin, no ARIA role
        await waitFor(() => {
            expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        });
    });

    it('displays candidate name in header', async () => {
        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no feedbacks available', async () => {
        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/No interview feedback available/i)).toBeInTheDocument();
        });
    });

    it('displays error message when fetching fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        getCandidateFeedbacks.mockRejectedValue(new Error('Network error'));

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Failed to load feedback data/i)).toBeInTheDocument();
        });
    });

    it('renders all feedbacks correctly', async () => {
        getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            // Email appears twice for fb2 (as the name text AND as email subtitle)
            const emailEls = screen.getAllByText('interviewer@example.com');
            expect(emailEls.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('displays recommendation badges with correct colors for Strong Yes', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        const { container } = renderComponent();

        await waitFor(() => {
            const badge = screen.getByText('Strong Yes');
            expect(badge).toHaveClass('bg-green-100', 'text-green-800');
        });
    });

    it('displays recommendation badges with correct colors for Yes', async () => {
        getCandidateFeedbacks.mockResolvedValue([
            { ...mockFeedbacks[0], recommendation: 'Yes' }
        ]);

        renderComponent();

        await waitFor(() => {
            const badge = screen.getByText('Yes');
            expect(badge).toHaveClass('bg-green-50', 'text-green-700');
        });
    });

    it('displays recommendation badges with correct colors for No', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[1]]);

        renderComponent();

        await waitFor(() => {
            const badge = screen.getByText('No');
            expect(badge).toHaveClass('bg-red-50', 'text-red-700');
        });
    });

    it('displays recommendation badges with correct colors for Strong No', async () => {
        getCandidateFeedbacks.mockResolvedValue([
            { ...mockFeedbacks[1], recommendation: 'Strong No' }
        ]);

        renderComponent();

        await waitFor(() => {
            const badge = screen.getByText('Strong No');
            expect(badge).toHaveClass('bg-red-100', 'text-red-800');
        });
    });

    it('displays recommendation badges with default color for unknown recommendation', async () => {
        getCandidateFeedbacks.mockResolvedValue([
            { ...mockFeedbacks[0], recommendation: 'Maybe' }
        ]);

        renderComponent();

        await waitFor(() => {
            const badge = screen.getByText('Maybe');
            expect(badge).toHaveClass('bg-gray-50', 'text-gray-700');
        });
    });

    it('renders overall score with stars', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        const { container } = renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Overall Score:/i)).toBeInTheDocument();
            expect(screen.getByText('(5/5)')).toBeInTheDocument();
        });
    });

    it('renders scorecard items when available', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Technical Skills')).toBeInTheDocument();
            expect(screen.getByText('Communication')).toBeInTheDocument();
            expect(screen.getByText('"Excellent"')).toBeInTheDocument();
            expect(screen.getByText('"Very good"')).toBeInTheDocument();
        });
    });

    it('does not render scorecard section when empty', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[1]]);

        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/Detailed Scorecard/i)).not.toBeInTheDocument();
        });
    });

    it('renders comments when available', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Great candidate, highly recommended/i)).toBeInTheDocument();
        });
    });

    it('does not render comments section when comments is null', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[1]]);

        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/Final Comments/i)).not.toBeInTheDocument();
        });
    });

    it('renders activity title', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
        });
    });

    it('displays interviewer initials when name is available', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        const { container } = renderComponent();

        await waitFor(() => {
            const initialsDiv = container.querySelector('.bg-blue-100');
            expect(initialsDiv).toHaveTextContent('JS');
        });
    });

    it('displays interviewer email initial when name is not available', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[1]]);

        const { container } = renderComponent();

        await waitFor(() => {
            const initialsDiv = container.querySelector('.bg-blue-100');
            expect(initialsDiv).toHaveTextContent('I');
        });
    });

    it('displays interviewer full name when available', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('displays interviewer email when name is not available', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[1]]);

        renderComponent();

        await waitFor(() => {
            // Email appears both as the name text and as the subtitle
            const emailEls = screen.getAllByText('interviewer@example.com');
            expect(emailEls.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('displays "Unknown Interviewer" when interviewer data is missing', async () => {
        getCandidateFeedbacks.mockResolvedValue([
            { ...mockFeedbacks[0], interviewer: null }
        ]);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Unknown Interviewer')).toBeInTheDocument();
        });
    });

    it('closes modal when X button is clicked', async () => {
        const onClose = vi.fn();
        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent({ onClose });

        await waitFor(() => {
            expect(screen.getByText(/No interview feedback available/i)).toBeInTheDocument();
        });

        const closeButton = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg') && btn.className.includes('hover:bg-gray-100')
        );
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('closes modal when backdrop is clicked', async () => {
        const onClose = vi.fn();
        getCandidateFeedbacks.mockResolvedValue([]);

        const { container } = renderComponent({ onClose });

        await waitFor(() => {
            expect(screen.getByText(/No interview feedback available/i)).toBeInTheDocument();
        });

        const backdrop = container.querySelector('.bg-gray-500');
        fireEvent.click(backdrop);

        expect(onClose).toHaveBeenCalled();
    });

    it('navigates to activities tab when "Schedule Next Interview" is clicked', async () => {
        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent();

        await waitFor(() => {
            const scheduleButton = screen.getByText(/Schedule Next Interview/i);
            fireEvent.click(scheduleButton);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/candidates/cand-123?tab=activities');
    });

    it('navigates to job pipeline when "Move to Next Stage" is clicked with job_id', async () => {
        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent();

        await waitFor(() => {
            const moveButton = screen.getByText(/Move to Next Stage/i);
            fireEvent.click(moveButton);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/jobs/job-456?tab=pipeline');
    });

    it('navigates to jobs page when "Move to Next Stage" is clicked without job_id', async () => {
        const candidateNoJob = {
            ...mockCandidate,
            applications: []
        };

        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent({ candidate: candidateNoJob });

        await waitFor(() => {
            const moveButton = screen.getByText(/Move to Next Stage/i);
            fireEvent.click(moveButton);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/jobs');
    });

    it('navigates using job.id when job_id is not available', async () => {
        const candidateWithJobObj = {
            ...mockCandidate,
            applications: [
                { job: { id: 'job-789' } }
            ]
        };

        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent({ candidate: candidateWithJobObj });

        await waitFor(() => {
            const moveButton = screen.getByText(/Move to Next Stage/i);
            fireEvent.click(moveButton);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/jobs/job-789?tab=pipeline');
    });

    it('closes modal before navigating on action button clicks', async () => {
        const onClose = vi.fn();
        getCandidateFeedbacks.mockResolvedValue([]);

        renderComponent({ onClose });

        await waitFor(() => {
            const scheduleButton = screen.getByText(/Schedule Next Interview/i);
            fireEvent.click(scheduleButton);
        });

        expect(onClose).toHaveBeenCalled();
    });

    it('formats dates correctly', async () => {
        getCandidateFeedbacks.mockResolvedValue([mockFeedbacks[0]]);

        renderComponent();

        await waitFor(() => {
            // Check that some date text is rendered (format varies by locale)
            const dateElements = screen.getAllByText(/1\/15\/2024|15\/1\/2024|2024/);
            expect(dateElements.length).toBeGreaterThan(0);
        });
    });

    it('renders multiple feedbacks in order', async () => {
        getCandidateFeedbacks.mockResolvedValue(mockFeedbacks);

        const { container } = renderComponent();

        await waitFor(() => {
            const feedbackCards = container.querySelectorAll('.border.border-gray-200.rounded-lg');
            expect(feedbackCards.length).toBe(2);
        });
    });

    it('refetches feedbacks when candidate id changes', async () => {
        getCandidateFeedbacks.mockResolvedValue([]);

        const { rerender } = render(
            <MemoryRouter>
                <FeedbackViewModal isOpen={true} onClose={vi.fn()} candidate={mockCandidate} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getCandidateFeedbacks).toHaveBeenCalledWith('cand-123');
        });

        const newCandidate = { ...mockCandidate, id: 'cand-456' };

        rerender(
            <MemoryRouter>
                <FeedbackViewModal isOpen={true} onClose={vi.fn()} candidate={newCandidate} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getCandidateFeedbacks).toHaveBeenCalledWith('cand-456');
        });
    });
});
