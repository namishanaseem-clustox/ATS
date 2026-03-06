import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskInboxWidget from '../components/TaskInboxWidget';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));
import { useAuth } from '../context/AuthContext';

// We mock the API modules entirely since useQuery will call them
vi.mock('../api/requisitions', () => ({
    getRequisitions: vi.fn(),
}));
vi.mock('../api/candidates', () => ({
    getCandidates: vi.fn(),
}));
vi.mock('../api/activities', () => ({
    getMyInterviews: vi.fn(),
}));

import { getRequisitions } from '../api/requisitions';
import { getCandidates } from '../api/candidates';
import { getMyInterviews } from '../api/activities';

function renderWidget(role = 'owner') {
    useAuth.mockReturnValue({ user: { role } });

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <TaskInboxWidget />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

describe('TaskInboxWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        getRequisitions.mockReturnValue(new Promise(() => { }));
        getCandidates.mockReturnValue(new Promise(() => { }));
        getMyInterviews.mockReturnValue(new Promise(() => { }));

        const { container } = renderWidget();
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders Inbox Zero state when there are no tasks', async () => {
        getRequisitions.mockResolvedValue([]);
        getCandidates.mockResolvedValue([]);
        getMyInterviews.mockResolvedValue([]);

        renderWidget();

        const successText = await screen.findByText("You're all caught up!");
        expect(successText).toBeInTheDocument();
    });

    it('renders and filters pending tasks correctly', async () => {
        // Pending reqs
        getRequisitions.mockResolvedValue([
            { id: '1', status: 'Pending', job_title: 'Backend Dev', requester: { full_name: 'John' } },
            { id: '2', status: 'Approved', job_title: 'Ignored', requester: { full_name: 'Jane' } }
        ]);

        // Candidates with "Applied" status
        getCandidates.mockResolvedValue([
            { id: '10', first_name: 'Alice', last_name: 'A', applications: [{ application_status: 'Applied', job: { title: 'JS Dev' } }] },
            { id: '11', first_name: 'Bob', last_name: 'B', applications: [{ application_status: 'Hired', job: { title: 'JS Dev' } }] }
        ]);

        // Activities in the past that are pending
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        getMyInterviews.mockResolvedValue([
            { id: '100', status: 'Pending', scheduled_at: pastDate.toISOString(), candidate_id: 'c1', candidate: { first_name: 'Charlie' } }, // Needs scorecard
            { id: '101', status: 'Completed', scheduled_at: pastDate.toISOString(), candidate_id: 'c2' }, // Ignored (Completed)
            { id: '102', status: 'Pending', scheduled_at: futureDate.toISOString(), candidate_id: 'c3' }, // Ignored (Future)
        ]);

        renderWidget();

        // 1 req + 1 cand + 1 activity = 3 tasks
        expect(await screen.findByText('3 Pending')).toBeInTheDocument();

        // Check specific items
        expect(screen.getByText(/Submit feedback for Charlie/)).toBeInTheDocument();
        expect(screen.getByText(/Review Backend Dev/)).toBeInTheDocument();
        expect(screen.getByText(/Review Alice A/)).toBeInTheDocument();

        // Ensure ignored items are missing
        expect(screen.queryByText(/Review Ignored/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Review Bob B/)).not.toBeInTheDocument();
    });

    it('interviewer role skips candidates and reqs, only fetches activities', async () => {
        getRequisitions.mockResolvedValue([]);
        getCandidates.mockResolvedValue([]);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        getMyInterviews.mockResolvedValue([
            { id: '100', status: 'Pending', scheduled_at: pastDate.toISOString(), candidate_id: 'c1', candidate: { first_name: 'Charlie' } },
        ]);

        renderWidget('interviewer');

        // Only 1 pending task (from activities)
        expect(await screen.findByText('1 Pending')).toBeInTheDocument();
        expect(screen.getByText(/Submit feedback for Charlie/)).toBeInTheDocument();

        // Requisitions and Candidates should not have been called because their query is disabled
        // Note: enabled: false in RQ means the queryFn won't be executed
        expect(getRequisitions).not.toHaveBeenCalled();
        expect(getCandidates).not.toHaveBeenCalled();
    });

    it('navigates to specific items when clicked', async () => {
        getRequisitions.mockResolvedValue([{ id: '1', status: 'Pending', job_title: 'Req 1', requester: { full_name: 'John' } }]);
        getCandidates.mockResolvedValue([{ id: '10', first_name: 'Cand 1', last_name: 'A', applications: [{ application_status: 'Applied', job: { title: 'JS Dev' } }] }]);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        getMyInterviews.mockResolvedValue([{ id: '100', status: 'Pending', scheduled_at: pastDate.toISOString(), candidate_id: 'c1', candidate: { first_name: 'Act 1' } }]);

        renderWidget();

        await screen.findByText('3 Pending');

        fireEvent.click(screen.getByText(/Review Req 1/));
        expect(mockNavigate).toHaveBeenCalledWith('/requisitions/1');

        fireEvent.click(screen.getByText(/Review Cand 1 A/));
        expect(mockNavigate).toHaveBeenCalledWith('/candidates/10');

        fireEvent.click(screen.getByText(/Submit feedback for Act 1/));
        expect(mockNavigate).toHaveBeenCalledWith('/candidates/c1?tab=activities');
    });
});
