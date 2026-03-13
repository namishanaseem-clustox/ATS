import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIScreeningModal from '../components/AIScreeningModal';
import * as jobsApi from '../api/jobs';

vi.mock('../api/jobs');
vi.mock('../components/Counter', () => ({
    default: ({ end }) => <span data-testid="counter">{end}</span>
}));

describe('AIScreeningModal Component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        jobId: 'job-123',
        candidateId: 'cand-456',
        candidateName: 'John Doe',
        initialData: null,
        onScreeningComplete: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when isOpen is false', () => {
        const { container } = render(
            <AIScreeningModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders modal with initial state when no screening data', () => {
        render(<AIScreeningModal {...defaultProps} />);

        expect(screen.getByText(/AI Screening:/i)).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/No AI screening has been performed yet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Run AI Screening/i })).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', () => {
        render(<AIScreeningModal {...defaultProps} />);

        const closeButton = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg') && btn.className.includes('text-gray-400')
        );
        fireEvent.click(closeButton);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes modal when backdrop is clicked', () => {
        render(<AIScreeningModal {...defaultProps} />);

        // Modal uses createPortal - backdrop is rendered in document.body
        // The clickable backdrop is the outer fixed div with transition-opacity
        const backdrop = document.querySelector('.fixed.inset-0.transition-opacity');
        fireEvent.click(backdrop);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('shows loading state when screening is in progress', async () => {
        jobsApi.screenCandidate.mockImplementation(() => new Promise(() => { })); // Never resolves

        render(<AIScreeningModal {...defaultProps} />);

        const runButton = screen.getByRole('button', { name: /Run AI Screening/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText(/Analyzing candidate profile/i)).toBeInTheDocument();
            expect(screen.getByText(/This may take a few seconds/i)).toBeInTheDocument();
        });
    });

    it('calls screenCandidate API when Run AI Screening is clicked', async () => {
        const mockResult = {
            ai_analysis: {
                match_score: 85,
                key_strengths: ['Strong technical skills', 'Good communication'],
                missing_skills: ['Cloud experience'],
                reasoning: 'Excellent candidate overall'
            }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        render(<AIScreeningModal {...defaultProps} />);

        const runButton = screen.getByRole('button', { name: /Run AI Screening/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(jobsApi.screenCandidate).toHaveBeenCalledWith('job-123', 'cand-456');
        });
    });

    it('displays screening results after successful API call', async () => {
        const mockResult = {
            ai_analysis: {
                match_score: 85,
                key_strengths: ['Strong technical skills', 'Good communication'],
                missing_skills: ['Cloud experience'],
                reasoning: 'Excellent candidate overall'
            }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        render(<AIScreeningModal {...defaultProps} />);

        const runButton = screen.getByRole('button', { name: /Run AI Screening/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText('Match Score')).toBeInTheDocument();
            expect(screen.getByTestId('counter')).toHaveTextContent('85');
            expect(screen.getByText('Strong technical skills')).toBeInTheDocument();
            expect(screen.getByText('Good communication')).toBeInTheDocument();
            expect(screen.getByText('Cloud experience')).toBeInTheDocument();
            expect(screen.getByText('Excellent candidate overall')).toBeInTheDocument();
        });
    });

    it('shows error state when API call fails', async () => {
        const errorMessage = 'Screening service unavailable';
        jobsApi.screenCandidate.mockRejectedValue({
            response: { data: { detail: errorMessage } }
        });

        render(<AIScreeningModal {...defaultProps} />);

        const runButton = screen.getByRole('button', { name: /Run AI Screening/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it('shows default error message when API error has no detail', async () => {
        jobsApi.screenCandidate.mockRejectedValue(new Error('Network error'));

        render(<AIScreeningModal {...defaultProps} />);

        const runButton = screen.getByRole('button', { name: /Run AI Screening/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText(/Failed to screen candidate. Please try again/i)).toBeInTheDocument();
        });
    });

    it('calls onScreeningComplete callback with result', async () => {
        const mockResult = {
            ai_analysis: {
                match_score: 75,
                key_strengths: ['Experience'],
                missing_skills: [],
                reasoning: 'Good fit'
            }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        render(<AIScreeningModal {...defaultProps} />);

        const runButton = screen.getByRole('button', { name: /Run AI Screening/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(defaultProps.onScreeningComplete).toHaveBeenCalledWith(mockResult);
        });
    });

    it('renders with initialData prop', () => {
        const initialData = {
            match_score: 90,
            key_strengths: ['Excellent skills'],
            missing_skills: [],
            reasoning: 'Perfect match'
        };

        render(<AIScreeningModal {...defaultProps} initialData={initialData} />);

        expect(screen.getByText('Match Score')).toBeInTheDocument();
        expect(screen.getByTestId('counter')).toHaveTextContent('90');
        expect(screen.getByText('Excellent skills')).toBeInTheDocument();
    });

    it('shows Re-run Screening button when data exists', async () => {
        const mockResult = {
            ai_analysis: {
                match_score: 80,
                key_strengths: [],
                missing_skills: [],
                reasoning: ''
            }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            expect(screen.getByText(/Re-run Screening/i)).toBeInTheDocument();
        });
    });

    it('re-runs screening when Re-run button is clicked', async () => {
        const firstResult = {
            ai_analysis: { match_score: 70, key_strengths: [], missing_skills: [], reasoning: '' }
        };
        const secondResult = {
            ai_analysis: { match_score: 85, key_strengths: [], missing_skills: [], reasoning: '' }
        };

        jobsApi.screenCandidate
            .mockResolvedValueOnce(firstResult)
            .mockResolvedValueOnce(secondResult);

        render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            expect(screen.getByTestId('counter')).toHaveTextContent('70');
        });

        fireEvent.click(screen.getByText(/Re-run Screening/i));

        await waitFor(() => {
            expect(screen.getByTestId('counter')).toHaveTextContent('85');
        });
    });

    it('applies green color for high match score (>=80)', async () => {
        const mockResult = {
            ai_analysis: { match_score: 85, key_strengths: [], missing_skills: [], reasoning: '' }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        const { container } = render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            const scoreBox = document.querySelector('.border-green-200');
            expect(scoreBox).toBeInTheDocument();
            expect(document.querySelector('.text-green-600')).toBeInTheDocument();
        });
    });

    it('applies yellow color for medium match score (60-79)', async () => {
        const mockResult = {
            ai_analysis: { match_score: 65, key_strengths: [], missing_skills: [], reasoning: '' }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        const { container } = render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            const scoreBox = document.querySelector('.border-yellow-200');
            expect(scoreBox).toBeInTheDocument();
            expect(document.querySelector('.text-yellow-600')).toBeInTheDocument();
        });
    });

    it('applies red color for low match score (<60)', async () => {
        const mockResult = {
            ai_analysis: { match_score: 45, key_strengths: [], missing_skills: [], reasoning: '' }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        const { container } = render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            const scoreBox = document.querySelector('.border-red-200');
            expect(scoreBox).toBeInTheDocument();
            expect(document.querySelector('.text-red-600')).toBeInTheDocument();
        });
    });

    it('handles missing optional fields gracefully', async () => {
        const mockResult = {
            ai_analysis: {
                match_score: 75
                // No key_strengths, missing_skills, or reasoning
            }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            expect(screen.getByTestId('counter')).toHaveTextContent('75');
            expect(screen.queryByText('Key Strengths')).not.toBeInTheDocument();
            expect(screen.queryByText('Missing Skills')).not.toBeInTheDocument();
            expect(screen.queryByText('Analysis')).not.toBeInTheDocument();
        });
    });

    it('resets screening data when candidateId changes', () => {
        const initialData = {
            match_score: 80,
            key_strengths: ['Skill A'],
            missing_skills: [],
            reasoning: 'Good'
        };

        const { rerender } = render(
            <AIScreeningModal {...defaultProps} initialData={initialData} />
        );

        expect(screen.getByText('Skill A')).toBeInTheDocument();

        // Change candidateId
        rerender(
            <AIScreeningModal
                {...defaultProps}
                candidateId="new-candidate-789"
                initialData={null}
            />
        );

        expect(screen.queryByText('Skill A')).not.toBeInTheDocument();
        expect(screen.getByText(/No AI screening has been performed yet/i)).toBeInTheDocument();
    });

    it('resets screening data when initialData changes', () => {
        const initialData1 = {
            match_score: 70,
            key_strengths: ['Old Skill'],
            missing_skills: [],
            reasoning: ''
        };

        const initialData2 = {
            match_score: 90,
            key_strengths: ['New Skill'],
            missing_skills: [],
            reasoning: ''
        };

        const { rerender } = render(
            <AIScreeningModal {...defaultProps} initialData={initialData1} />
        );

        expect(screen.getByText('Old Skill')).toBeInTheDocument();

        rerender(
            <AIScreeningModal {...defaultProps} initialData={initialData2} />
        );

        expect(screen.queryByText('Old Skill')).not.toBeInTheDocument();
        expect(screen.getByText('New Skill')).toBeInTheDocument();
    });

    it('displays empty arrays for key_strengths without crashing', async () => {
        const mockResult = {
            ai_analysis: {
                match_score: 60,
                key_strengths: [],
                missing_skills: ['Skill A', 'Skill B'],
                reasoning: 'Test'
            }
        };
        jobsApi.screenCandidate.mockResolvedValue(mockResult);

        render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            expect(screen.queryByText('Key Strengths')).not.toBeInTheDocument();
            expect(screen.getByText('Missing Skills')).toBeInTheDocument();
        });
    });

    it('closes modal via Close button in footer', () => {
        render(<AIScreeningModal {...defaultProps} />);

        const closeButton = screen.getByRole('button', { name: /Close/i });
        fireEvent.click(closeButton);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('disables Re-run button while loading', async () => {
        const firstResult = {
            ai_analysis: { match_score: 70, key_strengths: [], missing_skills: [], reasoning: '' }
        };

        jobsApi.screenCandidate
            .mockResolvedValueOnce(firstResult)
            .mockImplementation(() => new Promise(() => { })); // Never resolves second time

        render(<AIScreeningModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Run AI Screening/i }));

        await waitFor(() => {
            expect(screen.getByText(/Re-run Screening/i)).toBeInTheDocument();
        });

        const rerunButton = screen.getByText(/Re-run Screening/i);
        fireEvent.click(rerunButton);

        await waitFor(() => {
            expect(rerunButton).toBeDisabled();
        });
    });
});
