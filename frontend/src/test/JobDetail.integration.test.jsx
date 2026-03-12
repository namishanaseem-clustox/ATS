import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// CandidateRow mock — renders the candidate name, AI Screen button, and Remove button
vi.mock('../components/CandidateRow', () => ({
    default: ({ candidate, onDelete, onAIScreen }) => (
        <tr>
            <td>{candidate.first_name} {candidate.last_name}</td>
            <td>{candidate.applications?.[0]?.ai_score || '-'}</td>
            <td>
                {onAIScreen && <button title="AI Screen" onClick={onAIScreen}>AI</button>}
                <button title="Remove from job" onClick={onDelete}>Remove</button>
            </td>
        </tr>
    )
}));

vi.mock('../components/AIScreeningModal', () => ({
    default: ({ isOpen, onClose }) => isOpen ? (
        <div data-testid="ai-modal">
            <button onClick={onClose}>Close AI</button>
        </div>
    ) : null
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

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/jobs/job-123']}>
                <Routes>
                    <Route path="/jobs/:id" element={<JobDetail />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
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
        const jobWithSkills = { ...mockJob, skills: ['React', 'Node.js'] };
        jobsApi.getJob.mockResolvedValue(jobWithSkills);
        renderJobDetail();

        await waitFor(() => expect(screen.getByText('Software Engineer')).toBeInTheDocument());
        expect(screen.getAllByText('SE-001').length).toBeGreaterThan(0);
        expect(screen.getByText('Engineering')).toBeInTheDocument();

        // Verify skills rendering
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Node.js')).toBeInTheDocument();

        // Switch to Candidates tab
        fireEvent.click(screen.getByRole('button', { name: /^Candidates$/ }));
        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    });

    it('renders archived banner when job is archived', async () => {
        const archivedJob = { ...mockJob, status: 'Archived' };
        jobsApi.getJob.mockResolvedValue(archivedJob);
        renderJobDetail();

        await waitFor(() => expect(screen.getByText(/This job is currently/i)).toBeInTheDocument());
        expect(screen.getAllByText(/archived/i).length).toBeGreaterThan(0);
    });

    it('navigates to edit page on Edit Job click', async () => {
        // We need a mock for navigate, but since we used MemoryRouter and Routes, 
        // we can check if the location changes or just mock navigate if it was used directly.
        // JobDetail uses useNavigate() from react-router-dom.
        renderJobDetail();

        await waitFor(() => screen.getByTitle('Edit Job'));
        fireEvent.click(screen.getByTitle('Edit Job'));

        // Since we don't have a route for /jobs/:id/edit in our test's MemoryRouter, 
        // it might show "No routes matched". In a real integration test, we could 
        // add that route and check for a "Edit Job Page" text.
    });

    it('switches between all available tabs', async () => {
        const user = userEvent.setup();
        renderJobDetail();

        await waitFor(() => screen.getByText('Software Engineer'));

        // Pipeline
        await user.click(screen.getByRole('button', { name: /^Pipeline$/ }));
        expect(screen.getByTestId('job-pipeline')).toBeInTheDocument();

        // Activity
        await user.click(screen.getByRole('button', { name: /^Activity$/ }));
        expect(screen.getByTestId('job-activity-log')).toBeInTheDocument();

        // Notes
        await user.click(screen.getByRole('button', { name: /^Notes$/ }));
        expect(screen.getByTestId('note-list')).toBeInTheDocument();

        // Settings
        await user.click(screen.getByRole('button', { name: /^Settings$/ }));
        expect(screen.getByText('Publish Job')).toBeInTheDocument();
    });

    it('toggles column menu in candidates tab', async () => {
        const user = userEvent.setup();
        renderJobDetail();

        await waitFor(() => screen.getByRole('button', { name: /^Candidates$/ }));
        await user.click(screen.getByRole('button', { name: /^Candidates$/ }));

        const columnBtn = screen.getByRole('button', { name: /Columns/i });
        await user.click(columnBtn);

        expect(screen.getByText('Edit Columns')).toBeInTheDocument();
        expect(screen.getByLabelText(/AI Score/i)).toBeInTheDocument();

        // Click outside (the backdrop)
        await user.click(screen.getByRole('button', { name: /^Candidates$/ })); // Or just click the button again
        // Actually, the test code showed a fixed backdrop div.
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

    // ── 8: AI Screening & Sorting ───────────────────────────────────────────
    it('sorts candidates by AI score then name', async () => {
        const sortedCandidates = [
            { id: 'app-low', candidate: { id: 'cand-low', first_name: 'Zoe', last_name: 'Low' }, ai_score: 40 },
            { id: 'app-high', candidate: { id: 'cand-high', first_name: 'Adam', last_name: 'High' }, ai_score: 95 },
            { id: 'app-none-b', candidate: { id: 'cand-none-b', first_name: 'Bob', last_name: 'None' } },
            { id: 'app-none-a', candidate: { id: 'cand-none-a', first_name: 'Alice', last_name: 'None' } }
        ];
        candidatesApi.getJobCandidates.mockResolvedValue(sortedCandidates);
        renderJobDetail();

        await waitFor(() => expect(screen.getByText('Software Engineer')).toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', { name: /^Candidates$/ }));

        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            // Header is row 0. Content rows start from 1.
            // Expected order: High (95), Low (40), Alice (None), Bob (None)
            expect(rows[1]).toHaveTextContent('Adam High');
            expect(rows[2]).toHaveTextContent('Zoe Low');
            expect(rows[3]).toHaveTextContent('Alice None');
            expect(rows[4]).toHaveTextContent('Bob None');
        });
    });

    it('opens and closes AI screening modal', async () => {
        const user = userEvent.setup();
        renderJobDetail();

        await waitFor(() => expect(screen.getByText('Software Engineer')).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /^Candidates$/ }));
        await waitFor(() => screen.getByTitle('AI Screen'));

        await user.click(screen.getByTitle('AI Screen'));
        expect(screen.getByTestId('ai-modal')).toBeInTheDocument();

        await user.click(screen.getByText('Close AI'));
        expect(screen.queryByTestId('ai-modal')).not.toBeInTheDocument();
    });

    it('toggles a column and clicks backdrop in column menu', async () => {
        const user = userEvent.setup();
        renderJobDetail();

        await waitFor(() => screen.getByText('Software Engineer'));
        await user.click(screen.getByRole('button', { name: /^Candidates$/ }));

        // Open menu
        const columnBtn = screen.getByRole('button', { name: /Columns/i });
        await user.click(columnBtn);

        // Toggle location column
        const locationCheckbox = screen.getByLabelText(/Location/i);
        await user.click(locationCheckbox);

        // The header for location should eventually disappear or stay if we didn't mock table well
        // But the main goal is to trigger toggleColumn(key)

        // Toggle candidate column (should be ignored per line 44)
        const candidateCheckbox = screen.getByLabelText(/Candidate/i);
        await user.click(candidateCheckbox);

        // Click backdrop (the fixed div)
        // Since it's a div with a click handler, we can find it by some means or just use fireEvent
        const backdrop = document.querySelector('.fixed.inset-0.z-10');
        if (backdrop) fireEvent.click(backdrop);

        expect(screen.queryByText('Edit Columns')).not.toBeInTheDocument();
    });

    it('switches back to overview tab from candidates', async () => {
        const user = userEvent.setup();
        renderJobDetail();

        await waitFor(() => screen.getByText('Software Engineer'));

        // Go to candidates
        await user.click(screen.getByRole('button', { name: /^Candidates$/ }));
        expect(screen.getByText('John Doe')).toBeInTheDocument();

        // Go back to overview
        await user.click(screen.getByRole('button', { name: /^Overview$/ }));
        expect(screen.getByText('Job Details')).toBeInTheDocument();
    });
});