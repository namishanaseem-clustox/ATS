import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import JobDetail from '../pages/JobDetail';
import * as jobsApi from '../api/jobs';
import * as candidatesApi from '../api/candidates';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Shared mock — closed over by both AuthContext and RoleGuard mocks
const mockUseAuth = vi.fn();

vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: () => mockUseAuth(),
}));

// RoleGuard respects allowedRoles using the shared mockUseAuth closure
vi.mock('../components/RoleGuard', () => ({
    default: ({ children, allowedRoles }) => {
        const { user } = mockUseAuth();
        if (!user || !allowedRoles?.includes(user.role)) return null;
        return <>{children}</>;
    }
}));

vi.mock('../components/Breadcrumb', () => ({
    default: () => <div data-testid="breadcrumb" />
}));

vi.mock('../components/JobPipeline', () => ({
    default: ({ onMoveCandidate }) => (
        <div data-testid="job-pipeline">
            <button onClick={() => onMoveCandidate('cand-1', 'hired')}>Move Candidate</button>
        </div>
    )
}));

vi.mock('../components/ActivityList', () => ({
    default: () => <div data-testid="activity-list" />
}));

vi.mock('../components/NoteList', () => ({
    default: () => <div data-testid="note-list" />
}));

vi.mock('../components/JobActivityLog', () => ({
    default: () => <div data-testid="job-activity-log" />
}));

vi.mock('../components/AIScreeningModal', () => ({
    default: () => null
}));

// CandidateRow mock — renders the candidate name and "Remove from job" button
vi.mock('../components/CandidateRow', () => ({
    default: ({ candidate, onDelete }) => (
        <tr>
            <td>{candidate.first_name} {candidate.last_name}</td>
            <td>
                <button title="Remove from job" onClick={onDelete}>Remove</button>
            </td>
        </tr>
    )
}));

vi.mock('../api/jobs');
vi.mock('../api/candidates');

// ─── Sample data ─────────────────────────────────────────────────────────────

const mockJob = {
    id: 'job-123',
    title: 'Software Engineer',
    job_code: 'SE-001',
    status: 'Draft',
    department: { id: 'dept-1', name: 'Engineering' },
    pipeline_config: [
        { id: 'new', name: 'New' },
        { id: 'hired', name: 'Hired' }
    ]
};

const mockCandidates = [
    {
        id: 'app-1',
        candidate: { id: 'cand-1', first_name: 'John', last_name: 'Doe' },
        current_stage: 'new'
    }
];

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderJobDetail = (userRole = 'owner') => {
    mockUseAuth.mockReturnValue({
        user: { id: 'u1', role: userRole, full_name: 'Test User' },
        loading: false,
        isAuthenticated: true,
    });

    return render(
        <MemoryRouter initialEntries={['/jobs/job-123']}>
            <Routes>
                <Route path="/jobs/:id" element={<JobDetail />} />
            </Routes>
        </MemoryRouter>
    );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JobDetail Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReset();
        jobsApi.getJob.mockResolvedValue(mockJob);
        candidatesApi.getJobCandidates.mockResolvedValue(mockCandidates);
        window.confirm = vi.fn(() => true);
    });

    // ── 1: Renders job details and candidates ─────────────────────────────────
    it('renders job details and candidates successfully', async () => {
        renderJobDetail();

        await waitFor(() => expect(screen.getByText('Software Engineer')).toBeInTheDocument());
        expect(screen.getAllByText('SE-001').length).toBeGreaterThan(0);
        expect(screen.getByText('Engineering')).toBeInTheDocument();

        // Switch to Candidates tab
        fireEvent.click(screen.getByRole('button', { name: /^Candidates$/ }));
        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    });

    // ── 2: Archive job (Settings → More actions → Archive job) ───────────────
    it('handles job archival (delete)', async () => {
        const user = userEvent.setup();
        jobsApi.deleteJob.mockResolvedValue({ success: true });
        renderJobDetail();

        await screen.findByText('Software Engineer');

        // Go to Settings tab
        await user.click(screen.getByRole('button', { name: /^Settings$/ }));

        // Open "More actions" overflow menu
        await user.click(screen.getByRole('button', { name: /More actions/i }));

        // Click "Archive job" in the dropdown
        await user.click(screen.getByText(/Archive job/i));

        expect(window.confirm).toHaveBeenCalledWith(
            expect.stringContaining('archive "Software Engineer"')
        );
        expect(jobsApi.deleteJob).toHaveBeenCalledWith('job-123');
    });

    // ── 3: Clone job (Settings → More actions → Clone this job) ──────────────
    it('handles job cloning', async () => {
        const user = userEvent.setup();
        const clonedJob = { ...mockJob, id: 'job-cloned', title: 'Software Engineer (Clone)' };
        jobsApi.cloneJob.mockResolvedValue(clonedJob);
        renderJobDetail();

        await screen.findByText('Software Engineer');

        // Go to Settings tab
        await user.click(screen.getByRole('button', { name: /^Settings$/ }));

        // Open "More actions" overflow menu
        await user.click(screen.getByRole('button', { name: /More actions/i }));

        // Click "Clone this job" in the dropdown
        await user.click(screen.getByText(/Clone this job/i));

        expect(jobsApi.cloneJob).toHaveBeenCalledWith('job-123');
    });

    // ── 4: Publish job (Settings → Publish button) ───────────────────────────
    it('handles status toggle (Publish)', async () => {
        const user = userEvent.setup();
        const updatedJob = { ...mockJob, status: 'Published' };
        jobsApi.updateJob.mockResolvedValue(updatedJob);
        renderJobDetail();

        await screen.findByText('Software Engineer');

        // Go to Settings tab
        await user.click(screen.getByRole('button', { name: /^Settings$/ }));

        // The settings panel shows "Publish Job" as the section heading
        // and "Publish" as the button label (with a Send icon)
        await waitFor(() => expect(screen.getByText('Publish Job')).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /^Publish$/ }));

        expect(window.confirm).toHaveBeenCalledWith(
            expect.stringContaining('publish "Software Engineer"')
        );
        expect(jobsApi.updateJob).toHaveBeenCalledWith('job-123', { status: 'Published' });
    });

    // ── 5: Move candidate in pipeline ────────────────────────────────────────
    it('handles candidate movement in pipeline', async () => {
        const user = userEvent.setup();
        jobsApi.updateCandidateStage.mockResolvedValue({ success: true });
        renderJobDetail();

        await screen.findByText('Software Engineer');

        await user.click(screen.getByRole('button', { name: /^Pipeline$/ }));
        await screen.findByTestId('job-pipeline');
        await user.click(screen.getByText('Move Candidate'));

        expect(jobsApi.updateCandidateStage).toHaveBeenCalledWith('job-123', 'cand-1', 'hired');
    });

    // ── 6: Remove candidate from job ─────────────────────────────────────────
    it('handles candidate deletion from job', async () => {
        const user = userEvent.setup();
        candidatesApi.unlinkJobApplication.mockResolvedValue({ success: true });
        renderJobDetail();

        await screen.findByText('Software Engineer');

        await user.click(screen.getByRole('button', { name: /^Candidates$/ }));
        await screen.findByTitle('Remove from job');
        await user.click(screen.getByTitle('Remove from job'));

        expect(window.confirm).toHaveBeenCalledWith(
            expect.stringContaining('remove this candidate')
        );
        expect(candidatesApi.unlinkJobApplication).toHaveBeenCalledWith('cand-1', 'job-123');
    });

    // ── 7: Interviewer cannot see Pipeline or Settings tabs ───────────────────
    it('hides Pipeline and Settings tabs for interviewer role', async () => {
        renderJobDetail('interviewer');

        await waitFor(() => expect(screen.getByText('Software Engineer')).toBeInTheDocument());

        expect(screen.getByRole('button', { name: /^Overview$/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Candidates$/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Pipeline$/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Settings$/ })).not.toBeInTheDocument();
    });
});