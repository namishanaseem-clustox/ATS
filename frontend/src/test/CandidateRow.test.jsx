import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CandidateRow from '../components/CandidateRow';
import * as authContext from '../context/AuthContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../context/AuthContext');

vi.mock('../components/ApplicationStatusBadge', () => ({
    default: ({ status }) => <span data-testid="status-badge">{status}</span>
}));

vi.mock('../components/FeedbackViewModal', () => ({
    default: ({ isOpen, onClose, candidate }) => (
        isOpen ? (
            <tr data-testid="feedback-modal">
                <td>
                    <span>Feedback for {candidate.first_name}</span>
                    <button onClick={onClose}>Close Modal</button>
                </td>
            </tr>
        ) : null
    )
}));

vi.mock('../components/RoleGuard', () => ({
    default: ({ allowedRoles, children }) => <div data-testid="role-guard">{children}</div>
}));

describe('CandidateRow Component', () => {
    const mockCandidate = {
        id: 'cand-123',
        first_name: 'John',
        last_name: 'Doe',
        current_position: 'Software Engineer',
        current_company: 'Tech Corp',
        location: 'New York',
        experience_years: 5,
        applications: [
            {
                application_status: 'Under Review',
                current_stage: 'stage-2',
                ai_score: 85
            }
        ]
    };

    const mockStageMap = {
        'stage-1': 'Applied',
        'stage-2': 'Interview',
        'stage-3': 'Offer'
    };

    const defaultProps = {
        candidate: mockCandidate,
        onDelete: vi.fn(),
        onAIScreen: vi.fn(),
        visibleColumns: ['candidate', 'status', 'stage', 'location', 'experience', 'ai_score'],
        stageMap: mockStageMap
    };

    beforeEach(() => {
        vi.clearAllMocks();
        authContext.useAuth.mockReturnValue({
            user: { id: 'u1', role: 'hr' }
        });
    });

    const renderComponent = (props = {}) => {
        return render(
            <MemoryRouter>
                <table>
                    <tbody>
                        <CandidateRow {...defaultProps} {...props} />
                    </tbody>
                </table>
            </MemoryRouter>
        );
    };

    it('renders candidate name and position', () => {
        renderComponent();

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('shows "Open to work" when current_position is missing', () => {
        const candidate = { ...mockCandidate, current_position: null };
        renderComponent({ candidate });

        expect(screen.getByText('Open to work')).toBeInTheDocument();
    });

    it('renders candidate initials', () => {
        const { container } = renderComponent();

        const initialsDiv = container.querySelector('.bg-green-100');
        expect(initialsDiv).toHaveTextContent('JD');
    });

    it('displays application status badge', () => {
        renderComponent();

        const badge = screen.getByTestId('status-badge');
        expect(badge).toHaveTextContent('Under Review');
    });

    it('shows "No Status" when no applications exist', () => {
        const candidate = { ...mockCandidate, applications: [] };
        renderComponent({ candidate });

        expect(screen.getByText('No Status')).toBeInTheDocument();
    });

    it('displays stage from stageMap', () => {
        renderComponent();

        expect(screen.getByText('Interview')).toBeInTheDocument();
    });

    it('displays raw stage when not in stageMap', () => {
        const candidate = {
            ...mockCandidate,
            applications: [{ ...mockCandidate.applications[0], current_stage: 'unknown-stage' }]
        };
        renderComponent({ candidate });

        expect(screen.getByText('unknown-stage')).toBeInTheDocument();
    });

    it('shows dash when stage is missing', () => {
        const candidate = {
            ...mockCandidate,
            applications: [{ ...mockCandidate.applications[0], current_stage: null }]
        };
        renderComponent({ candidate });

        expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('displays location', () => {
        renderComponent();

        expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('shows "Remote" when location is missing', () => {
        const candidate = { ...mockCandidate, location: null };
        renderComponent({ candidate });

        expect(screen.getByText('Remote')).toBeInTheDocument();
    });

    it('displays experience in years', () => {
        renderComponent();

        expect(screen.getByText('5 years')).toBeInTheDocument();
    });

    it('displays AI score when available', () => {
        const { container } = renderComponent();

        expect(screen.getByText('85')).toBeInTheDocument();
        expect(container.querySelector('.bg-purple-50')).toBeInTheDocument();
    });

    it('shows dash when AI score is missing', () => {
        const candidate = {
            ...mockCandidate,
            applications: [{ ...mockCandidate.applications[0], ai_score: null }]
        };
        const { container } = renderComponent({ candidate });

        const aiScoreCell = container.querySelectorAll('td')[5]; // ai_score column
        expect(aiScoreCell).toHaveTextContent('-');
    });

    it('opens menu when menu button is clicked', () => {
        renderComponent();

        const menuButton = screen.getByRole('button');
        fireEvent.click(menuButton);

        expect(screen.getByText('View Profile')).toBeInTheDocument();
        expect(screen.getByText('Delete Candidate')).toBeInTheDocument();
    });

    it('closes menu when backdrop is clicked', async () => {
        const { container } = renderComponent();

        const menuButton = screen.getByRole('button');
        fireEvent.click(menuButton);

        await waitFor(() => {
            expect(screen.getByText('View Profile')).toBeInTheDocument();
        });

        const backdrop = container.querySelector('.fixed.inset-0');
        fireEvent.click(backdrop);

        await waitFor(() => {
            expect(screen.queryByText('View Profile')).not.toBeInTheDocument();
        });
    });

    it('navigates to candidate profile when View Profile is clicked', () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('View Profile'));

        expect(mockNavigate).toHaveBeenCalledWith('/candidates/cand-123');
    });

    it('calls onDelete when Delete Candidate is clicked', () => {
        const onDelete = vi.fn();
        renderComponent({ onDelete });

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Delete Candidate'));

        expect(onDelete).toHaveBeenCalledWith('cand-123');
    });

    it('calls onAIScreen when AI Screen menu item is clicked', () => {
        const onAIScreen = vi.fn();
        const candidateWithoutScore = {
            ...mockCandidate,
            applications: [{ ...mockCandidate.applications[0], ai_score: null }]
        };
        renderComponent({ candidate: candidateWithoutScore, onAIScreen });

        fireEvent.click(screen.getByRole('button'));

        const aiScreenButton = screen.getByText('Run AI Screen');
        fireEvent.click(aiScreenButton);

        expect(onAIScreen).toHaveBeenCalledWith(candidateWithoutScore.applications[0]);
    });

    it('shows "View Analysis" when AI score exists', () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('View Analysis')).toBeInTheDocument();
    });

    it('shows "Run AI Screen" when AI score does not exist', () => {
        const candidate = {
            ...mockCandidate,
            applications: [{ ...mockCandidate.applications[0], ai_score: null }]
        };
        renderComponent({ candidate });

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Run AI Screen')).toBeInTheDocument();
    });

    it('opens feedback modal when View Feedback is clicked', async () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('View Feedback'));

        await waitFor(() => {
            expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();
            expect(screen.getByText('Feedback for John')).toBeInTheDocument();
        });
    });

    it('closes feedback modal when modal close button is clicked', async () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('View Feedback'));

        await waitFor(() => {
            expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Close Modal'));

        await waitFor(() => {
            expect(screen.queryByTestId('feedback-modal')).not.toBeInTheDocument();
        });
    });

    it('does not show AI Screen option when no application exists', () => {
        const candidate = { ...mockCandidate, applications: [] };
        renderComponent({ candidate, onAIScreen: vi.fn() });

        fireEvent.click(screen.getByRole('button'));

        expect(screen.queryByText('Run AI Screen')).not.toBeInTheDocument();
        expect(screen.queryByText('View Analysis')).not.toBeInTheDocument();
    });

    it('respects visibleColumns prop', () => {
        renderComponent({ visibleColumns: ['candidate', 'status'] });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByTestId('status-badge')).toBeInTheDocument();

        // Location, experience, stage, ai_score should not be rendered
        expect(screen.queryByText('New York')).not.toBeInTheDocument();
        expect(screen.queryByText('5 years')).not.toBeInTheDocument();
    });

    it('handles missing visibleColumns prop (shows all columns)', () => {
        renderComponent({ visibleColumns: undefined });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByTestId('status-badge')).toBeInTheDocument();
        expect(screen.getByText('Interview')).toBeInTheDocument();
        expect(screen.getByText('New York')).toBeInTheDocument();
        expect(screen.getByText('5 years')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('uses latest application when multiple applications exist', () => {
        const candidate = {
            ...mockCandidate,
            applications: [
                { application_status: 'Rejected', current_stage: 'stage-1', ai_score: 60 },
                { application_status: 'Interview', current_stage: 'stage-2', ai_score: 85 },
                { application_status: 'Offer', current_stage: 'stage-3', ai_score: 95 }
            ]
        };
        renderComponent({ candidate });

        // Should use the last application
        const badge = screen.getByTestId('status-badge');
        expect(badge).toHaveTextContent('Offer');
        expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('closes menu when an action is taken', () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('View Profile')).toBeInTheDocument();

        fireEvent.click(screen.getByText('View Profile'));

        expect(screen.queryByText('Delete Candidate')).not.toBeInTheDocument();
    });

    it('handles null stageMap gracefully', () => {
        const candidate = {
            ...mockCandidate,
            applications: [{ ...mockCandidate.applications[0], current_stage: 'some-stage' }]
        };
        renderComponent({ candidate, stageMap: null });

        expect(screen.getByText('some-stage')).toBeInTheDocument();
    });

    it('wraps restricted actions in RoleGuard', () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button'));

        // View Feedback and Delete should be wrapped in RoleGuard
        const roleGuards = screen.getAllByTestId('role-guard');
        expect(roleGuards.length).toBeGreaterThan(0);
    });

    it('renders table row with correct styling', () => {
        const { container } = renderComponent();

        const row = container.querySelector('tr');
        expect(row).toHaveClass('hover:bg-gray-50');
    });

    it('handles missing applications array', () => {
        const candidate = { ...mockCandidate, applications: null };
        renderComponent({ candidate });

        expect(screen.getByText('No Status')).toBeInTheDocument();
    });
});
