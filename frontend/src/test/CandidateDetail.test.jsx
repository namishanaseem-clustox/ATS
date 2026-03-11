import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CandidateDetail from '../pages/CandidateDetail';
import * as authContext from '../context/AuthContext';
import * as candidateApi from '../api/candidates';

// Mock child components
vi.mock('../components/Breadcrumb', () => ({
    default: ({ items }) => <div data-testid="breadcrumb">{items.map(i => i.label).join(' > ')}</div>
}));

vi.mock('../components/ApplicationStatusBadge', () => ({
    default: ({ status }) => <div data-testid="status-badge">{status}</div>
}));

vi.mock('../components/ActivityList', () => ({
    default: ({ candidateId }) => <div data-testid="activity-list">Activities for {candidateId}</div>
}));

vi.mock('../components/NoteList', () => ({
    default: ({ candidateId }) => <div data-testid="note-list">Notes for {candidateId}</div>
}));

vi.mock('../components/CandidateScorecards', () => ({
    default: ({ candidateId }) => <div data-testid="scorecards">Scorecards for {candidateId}</div>
}));

vi.mock('../components/CandidateModal', () => ({
    default: ({ isOpen, onClose, candidate, onSave }) => isOpen ? (
        <div data-testid="candidate-modal">
            <span>Edit {candidate.first_name}</span>
            <button onClick={onClose}>Close</button>
            <button onClick={onSave}>Save</button>
        </div>
    ) : null
}));

vi.mock('../components/RoleGuard', () => ({
    default: ({ children, allowedRoles }) => {
        const { user } = authContext.useAuth();
        if (allowedRoles.includes(user.role)) {
            return <>{children}</>;
        }
        return null;
    }
}));

// Mock APIs
vi.mock('../api/candidates');

const mockCandidate = {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '1234567890',
    location: 'New York',
    experience_years: 5,
    resume_file_path: 'resumes/john_doe.pdf',
    skills: ['React', 'Node.js'],
    social_links: { linkedin: 'https://linkedin.com/in/johndoe' },
    applications: [
        {
            id: 'app1',
            job_id: 'job1',
            application_status: 'hired',
            applied_at: '2023-01-01T10:00:00Z',
            job: { title: 'Frontend Developer' }
        }
    ],
    experience_history: [
        {
            title: 'Senior Engineer',
            company: 'Tech Corp',
            dates: '2020 - Present',
            description: 'Worked on React projects.'
        }
    ],
    education: [
        {
            school: 'University of Tech',
            degree: 'B.S. Computer Science',
            year: '2019'
        }
    ]
};

describe('CandidateDetail Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        candidateApi.getCandidate.mockResolvedValue(mockCandidate);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'owner' }
        });
        window.confirm = vi.fn(() => true);
        window.alert = vi.fn();
    });

    const renderComponent = (id = '1', initialTab = 'overview') => {
        return render(
            <MemoryRouter initialEntries={[`/candidates/${id}?tab=${initialTab}`]}>
                <Routes>
                    <Route path="/candidates/:id" element={<CandidateDetail />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('renders candidate profile correctly', async () => {
        renderComponent();

        expect(screen.getByText(/Loading candidate profile.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
            expect(screen.getByText('1234567890')).toBeInTheDocument();
            expect(screen.getByText('New York')).toBeInTheDocument();
            expect(screen.getByText('5 years experience')).toBeInTheDocument();
            expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
            expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
            expect(screen.getByText('University of Tech')).toBeInTheDocument();
        });
    });

    it('handles candidate not found', async () => {
        candidateApi.getCandidate.mockResolvedValue(null);
        renderComponent('999');

        await waitFor(() => {
            expect(screen.getByText(/Candidate not found/i)).toBeInTheDocument();
        });
    });

    it('navigates between tabs', async () => {
        renderComponent();

        await waitFor(() => screen.getByText('John Doe'));

        // Default tab is Overview (but we passed initialTab=overview)
        expect(screen.getByText('Resume Status')).toBeInTheDocument();

        // Switch to Resume tab
        fireEvent.click(screen.getByText('Resume'));
        expect(screen.getByTitle('Resume Preview')).toBeInTheDocument();

        // Switch to Notes tab
        fireEvent.click(screen.getByText('Notes'));
        expect(screen.getByTestId('note-list')).toBeInTheDocument();

        // Switch to Activities tab
        fireEvent.click(screen.getByText('Activities'));
        expect(screen.getByTestId('activity-list')).toBeInTheDocument();
    });

    it('handles job unlinking successfully', async () => {
        candidateApi.unlinkJobApplication.mockResolvedValue({});
        renderComponent();

        await waitFor(() => screen.getByText('Frontend Developer'));

        const unlinkButton = screen.getByTitle('Remove Application');
        fireEvent.click(unlinkButton);

        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => {
            expect(candidateApi.unlinkJobApplication).toHaveBeenCalledWith('1', 'job1');
            expect(candidateApi.getCandidate).toHaveBeenCalledTimes(2); // Initial + Refresh
        });
    });

    it('handles job unlinking failure', async () => {
        candidateApi.unlinkJobApplication.mockRejectedValue(new Error('Fail'));
        renderComponent();

        await waitFor(() => screen.getByText('Frontend Developer'));

        const unlinkButton = screen.getByTitle('Remove Application');
        fireEvent.click(unlinkButton);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to remove application. Please try again.');
        });
    });

    it('opens and closes the Edit modal', async () => {
        renderComponent();

        await waitFor(() => screen.getByTitle('Edit Profile'));
        fireEvent.click(screen.getByTitle('Edit Profile'));

        expect(screen.getByTestId('candidate-modal')).toBeInTheDocument();
        expect(screen.getByText('Edit John')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByTestId('candidate-modal')).not.toBeInTheDocument();
    });

    it('refreshes data after modal save', async () => {
        renderComponent();

        await waitFor(() => screen.getByTitle('Edit Profile'));
        fireEvent.click(screen.getByTitle('Edit Profile'));

        fireEvent.click(screen.getByText('Save'));
        await waitFor(() => {
            expect(candidateApi.getCandidate).toHaveBeenCalledTimes(2);
        });
    });

    it('hides edit/unlink buttons for non-admin users', async () => {
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'interviewer' }
        });
        renderComponent();

        await waitFor(() => expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0));

        expect(screen.queryByTitle('Edit Profile')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Remove Application')).not.toBeInTheDocument();
    });

    it('renders empty states for skills, experience, and education', async () => {
        candidateApi.getCandidate.mockResolvedValue({
            ...mockCandidate,
            phone: null,
            location: null,
            skills: null,
            experience_history: null,
            education: null,
            applications: [{ id: 'app2', job_id: 'job2', application_status: 'rejected', applied_at: '2023-01-01T10:00:00Z', job: null }],
            resume_file_path: null
        });
        renderComponent();

        await waitFor(() => {
            expect(screen.getAllByText('N/A')).toHaveLength(2); // Phone and Location
            expect(screen.getByText('No skills parsed yet.')).toBeInTheDocument();
            expect(screen.getByText('No experience history available.')).toBeInTheDocument();
            expect(screen.getByText('No education history available.')).toBeInTheDocument();
            expect(screen.getByText('Unknown Job')).toBeInTheDocument();
            expect(screen.getByText('No resume uploaded')).toBeInTheDocument();
        });

        // Check resume tab empty state
        fireEvent.click(screen.getByText('Resume'));
        expect(screen.getByText('No resume file attached.')).toBeInTheDocument();
    });

    it('handles fetch failure gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        candidateApi.getCandidate.mockRejectedValue(new Error('Fetch failed'));
        renderComponent('123');

        await waitFor(() => {
            expect(screen.queryByText(/Loading candidate profile.../i)).not.toBeInTheDocument();
        });
        expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch candidate", expect.any(Error));
    });

    it('cancels job unlinking', async () => {
        window.confirm = vi.fn(() => false);
        renderComponent();

        await waitFor(() => screen.getByText('Frontend Developer'));

        const unlinkButton = screen.getByTitle('Remove Application');
        fireEvent.click(unlinkButton);

        expect(window.confirm).toHaveBeenCalled();
        expect(candidateApi.unlinkJobApplication).not.toHaveBeenCalled();
    });

    it('navigates back to overview', async () => {
        renderComponent('1', 'resume');

        await waitFor(() => screen.getByTitle('Resume Preview'));

        fireEvent.click(screen.getByText('Overview'));
        expect(screen.getByText('Resume Status')).toBeInTheDocument();
    });

    it('handles missing tab parameter in URL', async () => {
        // Render without tab param
        render(
            <MemoryRouter initialEntries={['/candidates/1']}>
                <Routes>
                    <Route path="/candidates/:id" element={<CandidateDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('John Doe'));
        expect(screen.getByText('Resume Status')).toBeInTheDocument(); // Default overview
    });

    it('renders empty active applications if null', async () => {
        candidateApi.getCandidate.mockResolvedValue({
            ...mockCandidate,
            applications: null
        });
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('No active applications')).toBeInTheDocument();
        });
    });
});
