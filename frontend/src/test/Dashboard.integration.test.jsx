/**
 * Dashboard Integration Tests
 *
 * Strategy: We mock `useAuth` directly so the dashboard renders immediately
 * with a known user. MSW handles all widget data API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../pages/Dashboard';
import { server } from './server';
import { http, HttpResponse } from 'msw';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: vi.fn(),
}));
import { useAuth } from '../context/AuthContext';

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => (
        <div data-testid="recharts-responsive-container">{children}</div>
    ),
    BarChart: () => <div data-testid="recharts-bar-chart" />,
    Bar: () => <div />, XAxis: () => <div />, YAxis: () => <div />,
    CartesianGrid: () => <div />, Tooltip: () => <div />
}));

// localStorage stub so axios interceptors don't throw
vi.stubGlobal('localStorage', {
    getItem: () => 'fake-token',
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
});

// ─── Helper ────────────────────────────────────────────────────────────────── 

const renderDashboard = (role = 'owner') => {
    useAuth.mockReturnValue({
        user: { id: 'u1', full_name: `Test ${role}`, role },
        loading: false,
        isAuthenticated: true,
    });

    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });

    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        </QueryClientProvider>
    );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard Integration Tests', () => {

    beforeEach(() => { vi.clearAllMocks(); });

    // ── Test 1: Structural render + data widgets ──────────────────────────────
    it('renders dashboard structure and fills in widget data from MSW', async () => {
        renderDashboard('owner');

        // Header is synchronous (no API required)
        expect(screen.getByText(/Welcome, Test owner/i)).toBeInTheDocument();
        expect(screen.getByText(/Here is what needs your attention today/i)).toBeInTheDocument();

        // Widget headings are inside components with loading states — use findByText
        await screen.findByText('RECENT ACTIONS');
        await screen.findByText('MY ACTIVITIES');
        await screen.findByText('MY PERFORMANCE');
        await screen.findByText('TOP PERFORMERS');

        // RecentActionsWidget — waits for MSW to serve Alice + Frontend Developer
        await screen.findByText(/Alice/);
        await screen.findByText('Frontend Developer');

        // MyActivitiesWidget — waits for MSW to serve Technical Interview
        await screen.findByText('Technical Interview');

        // MyPerformanceChartWidget — recharts mocked so we just check the container
        expect(screen.getByTestId('recharts-responsive-container')).toBeInTheDocument();
    });

    // ── Test 2: RoleGuard hides TopPerformers for interviewer ────────────────
    it('hides TopPerformersWidget for the interviewer role via RoleGuard', async () => {
        renderDashboard('interviewer');

        expect(screen.getByText(/Welcome, Test interviewer/i)).toBeInTheDocument();

        // TopPerformersWidget is in RoleGuard(['owner','hr','hiring_manager'])
        expect(screen.queryByText('TOP PERFORMERS')).not.toBeInTheDocument();

        // Non-gated widgets always render (but wait for loading to complete)
        await screen.findByText('MY ACTIVITIES');
        await screen.findByText('MY PERFORMANCE');
        await screen.findByText('RECENT ACTIONS');
    });

    // ── Test 3: No crash when data APIs return 500 ───────────────────────────
    it('renders page structure without crashing when data APIs return 500', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

        server.use(
            http.get('*/dashboard/top-performers', () => HttpResponse.json({}, { status: 500 })),
            http.get('*/dashboard/my-performance', () => HttpResponse.json({}, { status: 500 })),
            http.get('*/candidates/', () => HttpResponse.json({}, { status: 500 })),
            http.get('*/activities/my-interviews/', () => HttpResponse.json({}, { status: 500 })),
        );

        renderDashboard('owner');

        // Page header renders immediately (no API needed)
        expect(screen.getByText(/Welcome, Test owner/i)).toBeInTheDocument();

        // Widget headings appear after loading finishes (some may error-state, some succeed)
        await screen.findByText('RECENT ACTIONS');
        await screen.findByText('MY ACTIVITIES');
        await screen.findByText('MY PERFORMANCE');

        // MyActivitiesWidget empty-state appears after failed fetch
        await screen.findByText('No pending activities');

        consoleError.mockRestore();
    });
});
