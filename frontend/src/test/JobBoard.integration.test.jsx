/**
 * JobBoard Integration Tests
 *
 * Strategy: Mock `useAuth` to control the logged-in user. MSW intercepts all
 * API calls made by JobBoard and its sub-components. Tests cover:
 *  - Loading state
 *  - Table rendering with job data
 *  - Empty state
 *  - Role-gated "Create Job" button
 *  - Search filtering
 *  - Row navigation
 *  - API error resilience
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { server } from './server';
import { http, HttpResponse } from 'msw';
import JobBoard from '../pages/JobBoard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams, vi.fn()],
    };
});

vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: vi.fn(),
}));
import { useAuth } from '../context/AuthContext';

// Stub localStorage so the useColumnPersistence hook doesn't throw
vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
});

// ─── Sample data ─────────────────────────────────────────────────────────────

const ACTIVE_JOBS = [
    {
        id: 'j1',
        title: 'Frontend Developer',
        status: 'Published',
        location: 'Remote',
        headcount: 2,
        min_salary: 80000,
        max_salary: 120000,
        department: { id: 'd1', name: 'Engineering' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'j2',
        title: 'Product Manager',
        status: 'Draft',
        location: 'New York',
        headcount: 1,
        min_salary: null,
        max_salary: null,
        department: { id: 'd2', name: 'Product' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderBoard = (role = 'owner') => {
    useAuth.mockReturnValue({
        user: { id: 'u1', full_name: `Test ${role}`, role },
        loading: false,
        isAuthenticated: true,
    });

    return render(
        <MemoryRouter>
            <JobBoard />
        </MemoryRouter>
    );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JobBoard Integration Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockReset();
        server.resetHandlers();

        // Clear search params to avoid leakage
        [...mockSearchParams.keys()].forEach(key => mockSearchParams.delete(key));

        // Default MSW handlers
        server.use(
            http.get('http://localhost:8000/jobs', ({ request }) => {
                const url = new URL(request.url);
                if (url.searchParams.get('status') === 'Archived') {
                    return HttpResponse.json([]);
                }
                return HttpResponse.json(ACTIVE_JOBS);
            }),
            http.get('http://localhost:8000/departments', () => HttpResponse.json([])),
        );
    });

    // ── 1: Loading state ─────────────────────────────────────────────────────
    it('shows a loading message while fetching jobs', () => {
        renderBoard();
        expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
    });

    // ── 2: Table renders after data loads ────────────────────────────────────
    it('renders the page heading and job table after data loads', async () => {
        renderBoard('owner');

        // Wait for loading to finish
        await screen.findByText('Frontend Developer');

        expect(screen.getByRole('heading', { name: /Jobs/i })).toBeInTheDocument();
        expect(screen.getByText('All open positions across your organization.')).toBeInTheDocument();

        // Column headers
        expect(screen.getByText('Position Name')).toBeInTheDocument();
        expect(screen.getByText('Job Department')).toBeInTheDocument();
        expect(screen.getByText('Job Location')).toBeInTheDocument();
        expect(screen.getByText('Job Stage')).toBeInTheDocument();
        expect(screen.getByText('Salary Range')).toBeInTheDocument();

        // Row data
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Remote')).toBeInTheDocument();
        expect(screen.getByText('Published')).toBeInTheDocument();

        expect(screen.getByText('Product Manager')).toBeInTheDocument();
        expect(screen.getByText('New York')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    // ── 3: Salary range formatting ───────────────────────────────────────────
    it('formats salary range for jobs that have min/max, and shows "Negotiable" when absent', async () => {
        renderBoard();
        await screen.findByText('Frontend Developer');

        // j1 has 80k-120k salary
        expect(screen.getByText('80,000 - 120,000')).toBeInTheDocument();
        // j2 has no salary info
        expect(screen.getByText('Negotiable')).toBeInTheDocument();
    });

    // ── 4: Results count ─────────────────────────────────────────────────────
    it('shows the correct results count', async () => {
        renderBoard();
        await screen.findByText('Frontend Developer');
        const resultsContainer = screen.getByText(/Results:/i);
        expect(resultsContainer).toHaveTextContent('2');
    });

    // ── 5: Role guard — owner/hr see Create Job button ───────────────────────
    it('shows the "+ Create Job" button for owner role', async () => {
        renderBoard('owner');
        await screen.findByText('Frontend Developer');
        expect(screen.getByRole('button', { name: /\+ Create Job/i })).toBeInTheDocument();
    });

    it('shows the "+ Create Job" button for hr role', async () => {
        renderBoard('hr');
        await screen.findByText('Frontend Developer');
        expect(screen.getByRole('button', { name: /\+ Create Job/i })).toBeInTheDocument();
    });

    it('hides the "+ Create Job" button for interviewer role', async () => {
        renderBoard('interviewer');
        await screen.findByText('Frontend Developer');
        expect(screen.queryByRole('button', { name: /\+ Create Job/i })).not.toBeInTheDocument();
    });

    // ── 6: Empty state ───────────────────────────────────────────────────────
    it('shows the empty state when no jobs are returned', async () => {
        server.use(
            http.get('*/jobs', () => HttpResponse.json([])),
        );

        renderBoard('owner');
        await screen.findByText('No jobs yet');
        expect(screen.getByText('Post your first open position to start hiring.')).toBeInTheDocument();
        // Empty state Create button (role: owner)
        expect(screen.getByRole('button', { name: /Create your first job/i })).toBeInTheDocument();
    });

    it('hides the empty-state "Create your first job" button for interviewer', async () => {
        server.use(
            http.get('*/jobs', () => HttpResponse.json([])),
        );

        renderBoard('interviewer');
        await screen.findByText('No jobs yet');
        expect(screen.queryByRole('button', { name: /Create your first job/i })).not.toBeInTheDocument();
    });

    // ── 7: Search filtering ──────────────────────────────────────────────────
    it('filters job rows by title search input', async () => {
        const user = userEvent.setup();
        renderBoard();
        await screen.findByText('Frontend Developer');

        const searchInput = screen.getByPlaceholderText(/Search by title/i);
        await user.type(searchInput, 'frontend');

        // Only "Frontend Developer" should remain visible
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.queryByText('Product Manager')).not.toBeInTheDocument();
    });

    it('filters job rows by location search input', async () => {
        const user = userEvent.setup();
        renderBoard();
        await screen.findByText('Frontend Developer');

        const searchInput = screen.getByPlaceholderText(/Search by title/i);
        await user.type(searchInput, 'new york');

        expect(screen.getByText('Product Manager')).toBeInTheDocument();
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
    });

    // ── 8: Row navigation ────────────────────────────────────────────────────
    it('navigates to /jobs/:id when a job row is clicked', async () => {
        const user = userEvent.setup();
        renderBoard();
        await screen.findByText('Frontend Developer');

        await user.click(screen.getByText('Frontend Developer'));
        expect(mockNavigate).toHaveBeenCalledWith('/jobs/j1');
    });

    // ── 9: API error resilience ───────────────────────────────────────────────
    it('renders without crashing when the jobs API returns 500', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

        server.use(
            http.get('*/jobs', () => HttpResponse.json({}, { status: 500 })),
        );

        renderBoard();

        // After the failed fetch finishes, the loading state resolves and
        // the empty state or the heading should appear
        await waitFor(() => {
            expect(screen.queryByText('Loading jobs...')).not.toBeInTheDocument();
        });

        // Page does not crash — empty state or heading is visible
        expect(screen.getByText('No jobs yet')).toBeInTheDocument();

        consoleError.mockRestore();
    });

    // ── 10: ColumnSelector toggling ──────────────────────────────────────────
    it('toggles non-required columns correctly and prevents toggling required ones', async () => {
        const user = userEvent.setup();
        renderBoard();
        await screen.findByText('Frontend Developer');

        // Open column selector (assuming it's a dropdown or similar button that opens the columns)
        const columnsBtn = screen.getByRole('button', { name: /Columns/i }); // ColumnSelector uses a 'Columns' button usually, wait let's find it by icon or testid if not. Actually, let's just find the button that has Columns. If there isn't one, we find by text.
        // The Columns icon is used, and the text might be visually hidden or present. Let's assume there's a button.
        await user.click(columnsBtn);

        // Click a non-required column to toggle it off (e.g., Job Stage)
        const stageToggle = screen.getByRole('checkbox', { name: /Job Stage/i });
        await user.click(stageToggle);

        // Ensure "Job Stage" is no longer in the document headers
        expect(screen.queryByRole('columnheader', { name: /Job Stage/i })).not.toBeInTheDocument();

        // Click a required column to try to toggle it off (e.g., Position Name)
        const titleToggle = screen.getByRole('checkbox', { name: /Position Name/i });
        await user.click(titleToggle);

        // Required column should still be there
        expect(screen.getByRole('columnheader', { name: /Position Name/i })).toBeInTheDocument();
    });

    // ── 11: FilterPanel ──────────────────────────────────────────────────────
    it('applies filters from the FilterPanel', async () => {
        const user = userEvent.setup();
        renderBoard();
        await screen.findByText('Frontend Developer');

        // Open Filter Panel
        const filterBtn = screen.getByRole('button', { name: /Filters/i });
        await user.click(filterBtn);

        // Select 'Draft' status
        const draftCheckbox = screen.getByRole('checkbox', { name: /Draft/i });
        await user.click(draftCheckbox);

        // Wait for it to apply
        expect(screen.getByText('Product Manager')).toBeInTheDocument(); // Draft
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument(); // Published

        // Clear filters
        // Replace line 318:
        const clearBtn = screen.getByRole('button', { name: /Clear/i });
        await user.click(clearBtn);

        expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('Product Manager')).toBeInTheDocument();
    });

    // ── 12: Embedded Department & Fetching ───────────────────────────────────
    it('fetches department details when embeddedDepartmentId is provided', async () => {
        server.use(
            http.get('*/departments', () => HttpResponse.json([{ id: 'd1', name: 'Engineering Dept', description: 'Eng description' }]))
        );

        // ✅ Add this — useAuth must be mocked before rendering
        useAuth.mockReturnValue({
            user: { id: 'u1', role: 'owner' },
            loading: false,
            isAuthenticated: true,
        });

        render(
            <MemoryRouter>
                <JobBoard embeddedDepartmentId="d1" />
            </MemoryRouter>
        );

        await screen.findByText('Frontend Developer');
    });
    it('fetches and displays department details when "?dept=" URL param is provided', async () => {
        mockSearchParams.set('dept', 'd1');
        server.use(
            http.get('http://localhost:8000/departments', () =>
                HttpResponse.json([{ id: 'd1', name: 'Engineering Dept', description: 'Eng description' }])
            )
        );

        // ✅ Remove the manual useAuth.mockReturnValue here — renderBoard() handles it
        // OR: skip renderBoard() and render directly (shown below)
        useAuth.mockReturnValue({
            user: { id: 'u1', role: 'owner' },
            loading: false,
            isAuthenticated: true,
        });

        // ✅ Use render() directly so useAuth isn't overwritten
        render(
            <MemoryRouter>
                <JobBoard />
            </MemoryRouter>
        );

        // Replace lines 369-371:
        const title = await screen.findByRole('heading', { name: 'Engineering Dept' });
        expect(title).toBeInTheDocument();
        expect(screen.getByText('Eng description')).toBeInTheDocument();
    });

    // ── 13: Unarchive Flow ───────────────────────────────────────────────────
    it('allows unarchiving an archived job', async () => {
        const user = userEvent.setup();
        let unarchiveCalled = false;

        server.use(
            http.get('http://localhost:8000/jobs', ({ request }) => {
                const url = new URL(request.url);
                if (url.searchParams.get('status') === 'Archived') {
                    return HttpResponse.json([{ ...ACTIVE_JOBS[0], id: 'archived-1', status: 'Archived', title: 'Archived Job' }]);
                }
                return HttpResponse.json([]);
            }),
            http.put('http://localhost:8000/jobs/:id', () => {
                unarchiveCalled = true;
                return HttpResponse.json({ success: true });
            })
        );
        mockSearchParams.set('status', 'Archived');

        renderBoard('owner');

        await screen.findByText('Archived Job');

        // Mock window.confirm to return true
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        const unarchiveBtn = screen.getByRole('button', { name: /Unarchive/i });
        await user.click(unarchiveBtn);

        expect(confirmSpy).toHaveBeenCalled();
        expect(unarchiveCalled).toBe(true);

        mockSearchParams.delete('status');
        confirmSpy.mockRestore();
    });

    // ── 14: Permanent Delete Flow ────────────────────────────────────────────
    it('allows permanently deleting an archived job', async () => {
        const user = userEvent.setup();
        let deleteCalled = false;

        server.use(
            http.get('http://localhost:8000/jobs', ({ request }) => {
                const url = new URL(request.url);
                if (url.searchParams.get('status') === 'Archived') {
                    // Start with 1 archived, then return 0 after delete Called? Let's just track deleteCalled
                    return deleteCalled ? HttpResponse.json([]) : HttpResponse.json([{ ...ACTIVE_JOBS[0], id: 'archived-1', status: 'Archived', title: 'Archived Job' }]);
                }
                return HttpResponse.json([]);
            }),
            http.delete('http://localhost:8000/jobs/:id/permanent', () => {
                deleteCalled = true;
                return HttpResponse.json({ success: true });
            })
        );
        mockSearchParams.set('status', 'Archived');

        renderBoard('owner');

        await screen.findByText('Archived Job');

        const deleteBtn = screen.getByRole('button', { name: /Delete/i });
        await user.click(deleteBtn);

        // Modal should open
        // Type the job title to confirm
        const confirmInput = screen.getByPlaceholderText('Archived Job');
        await user.type(confirmInput, 'Archived Job');

        const confirmDeleteBtn = screen.getByRole('button', { name: /Permanently Delete/i });
        await user.click(confirmDeleteBtn);

        expect(deleteCalled).toBe(true);
        // Wait for removal
        await waitFor(() => {
            expect(screen.queryByText('Archived Job')).not.toBeInTheDocument();
        });

        mockSearchParams.delete('status');
    });
});
