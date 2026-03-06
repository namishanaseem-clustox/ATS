import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TopPerformersWidget from '../components/TopPerformersWidget';

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

vi.mock('../api/dashboard', () => ({
    getTopPerformers: vi.fn(),
}));
import { getTopPerformers } from '../api/dashboard';

function renderWidget(role = 'owner', userId = 'u1') {
    useAuth.mockReturnValue({ user: { role, id: userId } });

    // Use a fresh QueryClient for each test to avoid cache pollution
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <TopPerformersWidget />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

describe('TopPerformersWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially by showing Loading... text in sections', async () => {
        getTopPerformers.mockReturnValue(new Promise(() => { })); // Never resolves
        renderWidget();

        // The widget itself renders, but sections say "Loading..."
        expect(screen.getByText('TOP PERFORMERS')).toBeInTheDocument();
        const loadingTexts = screen.getAllByText('Loading...');
        expect(loadingTexts.length).toBe(4); // 4 sections
    });

    it('renders empty states when no data is returned', async () => {
        getTopPerformers.mockResolvedValue({ hires: [], candidates: [], jobs: [], actions: [] });
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No users with hires found.')).toBeInTheDocument();
            expect(screen.getByText('No users with candidates found.')).toBeInTheDocument();
            expect(screen.getByText('No users with jobs found.')).toBeInTheDocument();
            expect(screen.getByText('No users with actions found.')).toBeInTheDocument();
        });
    });

    it('renders top performers across categories with correct ranks', async () => {
        getTopPerformers.mockResolvedValue({
            hires: [
                { id: 'u1', name: 'Alice Smith', count: 5 },
                { id: 'u2', name: 'Bob Jones', count: 3 }
            ],
            candidates: [],
            jobs: [],
            actions: []
        });

        renderWidget('owner', 'u1'); // Me = Alice

        await waitFor(() => {
            // "You" instead of Alice Smith
            expect(screen.getByText('You')).toBeInTheDocument();
            expect(screen.getByText('Bob Jones')).toBeInTheDocument();
        });

        // Checking Rank Badges
        expect(screen.getByText('1st')).toBeInTheDocument(); // Alice
        expect(screen.getByText('2nd')).toBeInTheDocument(); // Bob

        // Count text
        expect(screen.getByText('5 hires')).toBeInTheDocument();
        expect(screen.getByText('3 hires')).toBeInTheDocument();
    });

    it('expands section when "View more" or "+X more" is clicked', async () => {
        // Need more than 3 to test expansion
        getTopPerformers.mockResolvedValue({
            hires: [
                { id: 'u1', name: 'User One', count: 10 },
                { id: 'u2', name: 'User Two', count: 9 },
                { id: 'u3', name: 'User Three', count: 8 },
                { id: 'u4', name: 'User Four', count: 7 },
                { id: 'u5', name: 'User Five', count: 6 },
            ],
            candidates: [],
            jobs: [],
            actions: []
        });

        // Pass an ID that doesn't match any mockup so NO ONE is "You"
        renderWidget('owner', 'u99');

        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
            expect(screen.getByText('User Three')).toBeInTheDocument();
        });

        // 4 and 5 should be hidden initially
        expect(screen.queryByText('User Four')).not.toBeInTheDocument();

        // The View More button
        const viewMoreBtns = screen.getAllByText('View more');
        expect(viewMoreBtns.length).toBe(1); // Only Hires has > 3

        // And the inline button
        expect(screen.getByText(/\+2 more/)).toBeInTheDocument();

        // Click to expand
        fireEvent.click(viewMoreBtns[0]);

        // Now 4 and 5 should be visible
        expect(screen.getByText('User Four')).toBeInTheDocument();
        expect(screen.getByText('User Five')).toBeInTheDocument();

        // Button changes to View less
        expect(screen.getAllByText('View less').length).toBeGreaterThan(0);

        // Click to collapse
        fireEvent.click(screen.getAllByText('View less')[0]); // Header view less button
        expect(screen.queryByText('User Four')).not.toBeInTheDocument();
    });

    it('navigates to team directory on user click', async () => {
        getTopPerformers.mockResolvedValue({
            hires: [{ id: 'u1', name: 'Admin User', count: 5 }],
            candidates: [], jobs: [], actions: []
        });

        renderWidget('owner', 'u2'); // Me = u2, so u1 is just "Admin User"

        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Admin User'));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/team');
    });

    it('triggers refetch when timeframe is changed', async () => {
        getTopPerformers.mockResolvedValue({ hires: [], candidates: [], jobs: [], actions: [] });

        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('TOP PERFORMERS')).toBeInTheDocument();
        });

        // Default query is for this_month
        expect(getTopPerformers).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: ['top-performers', 'this_month']
        }));

        // Change select
        const select = screen.getByDisplayValue('This Month');
        fireEvent.change(select, { target: { value: 'today' } });

        // Query should be triggered again for "today"
        await waitFor(() => {
            expect(getTopPerformers).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: ['top-performers', 'today']
            }));
        });
    });

    it('has a functional Refresh button', async () => {
        getTopPerformers.mockResolvedValue({ hires: [], candidates: [], jobs: [], actions: [] });

        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Refresh')).toBeInTheDocument();
        });

        const refreshBtn = screen.getByText('Refresh');

        // clear call count
        getTopPerformers.mockClear();

        fireEvent.click(refreshBtn);

        // A refetch should occur
        await waitFor(() => {
            expect(getTopPerformers).toHaveBeenCalledTimes(1);
        });
    });
});
