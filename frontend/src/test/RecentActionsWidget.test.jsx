import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecentActionsWidget from '../components/RecentActionsWidget';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api/candidates', () => ({
    getCandidates: vi.fn(),
}));
vi.mock('../api/jobs', () => ({
    getJobs: vi.fn(),
}));

import { getCandidates } from '../api/candidates';
import { getJobs } from '../api/jobs';

function renderWidget() {
    return render(
        <BrowserRouter>
            <RecentActionsWidget />
        </BrowserRouter>
    );
}

describe('RecentActionsWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading pulse initially', () => {
        getCandidates.mockReturnValue(new Promise(() => { }));
        getJobs.mockReturnValue(new Promise(() => { }));

        const { container } = renderWidget();
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('fetches candidates and jobs and maps them up to 4 items each, prioritizing updated_at over created_at', async () => {
        // mock 5 candidates
        const mockCandidates = [
            { id: '1', first_name: 'Alice', last_name: 'One', created_at: '2020-01-01T00:00:00Z', updated_at: '2023-10-10T10:00:00Z' }, // newest update
            { id: '2', first_name: 'Bob', last_name: 'Two', created_at: '2023-10-09T10:00:00Z' }, // no updated_at, fallback to created_at
            { id: '3', first_name: 'Charlie', last_name: 'Three', created_at: '2023-10-08T10:00:00Z' },
            { id: '4', first_name: 'Diana', last_name: 'Four', created_at: '2023-10-07T10:00:00Z' },
            { id: '5', first_name: 'Eve', last_name: 'Five', created_at: '2023-10-06T10:00:00Z' }, // should be sliced out
        ];

        // mock 2 jobs
        const mockJobs = [
            { id: 'j1', title: 'Senior Developer', created_at: '2023-10-10T10:00:00Z', department: { name: 'Engineering' } },
            { id: 'j2', title: 'QA Engineer', created_at: '2023-10-09T10:00:00Z' }, // No department
        ];

        getCandidates.mockResolvedValue([...mockCandidates]);
        getJobs.mockResolvedValue([...mockJobs]);

        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('RECENT ACTIONS')).toBeInTheDocument();
        });

        // 4 Candidates
        expect(screen.getByText('Alice One')).toBeInTheDocument();
        expect(screen.getByText('Bob Two')).toBeInTheDocument();
        expect(screen.getByText('Charlie Three')).toBeInTheDocument();
        expect(screen.getByText('Diana Four')).toBeInTheDocument();

        // Eve should be sliced out
        expect(screen.queryByText('Eve Five')).not.toBeInTheDocument();

        // 2 Jobs
        expect(screen.getByText('Senior Developer')).toBeInTheDocument();
        expect(screen.getByText('QA Engineer')).toBeInTheDocument();

        // Check fallback texts
        // Bob has no applied job, fallback 'General Application'
        const generalApps = screen.getAllByText('General Application');
        expect(generalApps.length).toBeGreaterThanOrEqual(1);

        // QA has no department, fallback 'Department'
        expect(screen.getByText('Department')).toBeInTheDocument();

        // Check initials mapping
        expect(screen.getByText('AO')).toBeInTheDocument(); // Alice One
        expect(screen.getByText('BT')).toBeInTheDocument(); // Bob Two
        expect(screen.getByText('SD')).toBeInTheDocument(); // Senior Developer
        expect(screen.getByText('QE')).toBeInTheDocument(); // QA Engineer
    });

    it('handles api errors gracefully without crashing', async () => {
        const spyError = vi.spyOn(console, 'error').mockImplementation(() => { });
        getCandidates.mockRejectedValue(new Error('API fail'));
        getJobs.mockRejectedValue(new Error('API fail'));

        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('RECENT ACTIONS')).toBeInTheDocument();
        });

        // Grids should render but be empty
        expect(screen.queryByText('General Application')).not.toBeInTheDocument();

        spyError.mockRestore();
    });

    it('navigates when items are clicked', async () => {
        getCandidates.mockResolvedValue([{ id: '1', first_name: 'Click', last_name: 'Me', created_at: '2023-10-10T10:00:00Z' }]);
        getJobs.mockResolvedValue([{ id: 'j1', title: 'Click Job', created_at: '2023-10-10T10:00:00Z' }]);

        renderWidget();

        const candLink = await screen.findByText('Click Me');
        fireEvent.click(candLink);
        expect(mockNavigate).toHaveBeenCalledWith('/candidates/1');

        const jobLink = await screen.findByText('Click Job');
        fireEvent.click(jobLink);
        expect(mockNavigate).toHaveBeenCalledWith('/jobs/j1');
    });

});
