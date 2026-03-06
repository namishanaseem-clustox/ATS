import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyPerformanceChartWidget from '../components/MyPerformanceChartWidget';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../api/dashboard', () => ({
    getMyPerformance: vi.fn(),
}));
import { getMyPerformance } from '../api/dashboard';

// Recharts relies on ResizeObserver and other DOM metrics not present in JSDOM.
// We mock it to just render distinctive DOM elements we can assert against.
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
    BarChart: ({ data, children }) => <div data-testid="recharts-bar-chart" data-chart-data={JSON.stringify(data)}>{children}</div>,
    Bar: ({ dataKey }) => <div data-testid={`recharts-bar-${dataKey}`} />,
    XAxis: ({ dataKey }) => <div data-testid={`recharts-xaxis-${dataKey}`} />,
    YAxis: () => <div data-testid="recharts-yaxis" />,
    CartesianGrid: () => <div data-testid="recharts-cartesian-grid" />,
    Tooltip: () => <div data-testid="recharts-tooltip" />
}));

function renderWidget() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MyPerformanceChartWidget />
        </QueryClientProvider>
    );
}

describe('MyPerformanceChartWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the loading state initially', () => {
        getMyPerformance.mockReturnValue(new Promise(() => { })); // Never resolves
        renderWidget();

        expect(screen.getByText('MY PERFORMANCE')).toBeInTheDocument();
        expect(screen.getByText('Loading chart...')).toBeInTheDocument();
        // The chart should not be in the document yet
        expect(screen.queryByTestId('recharts-responsive-container')).not.toBeInTheDocument();
    });

    it('renders the mocked Recharts components with empty data gracefully', async () => {
        getMyPerformance.mockResolvedValue([]);
        renderWidget();

        await waitFor(() => {
            expect(screen.queryByText('Loading chart...')).not.toBeInTheDocument();
        });

        // The mocked chart components should be present
        expect(screen.getByTestId('recharts-responsive-container')).toBeInTheDocument();
        const barChart = screen.getByTestId('recharts-bar-chart');
        expect(barChart).toBeInTheDocument();

        // Assert that the data stringified prop is an empty array
        expect(barChart.getAttribute('data-chart-data')).toBe('[]');

        // Children of the chart should be present
        expect(screen.getByTestId('recharts-bar-candidates')).toBeInTheDocument();
        expect(screen.getByTestId('recharts-xaxis-name')).toBeInTheDocument();
        expect(screen.getByTestId('recharts-yaxis')).toBeInTheDocument();
        expect(screen.getByTestId('recharts-cartesian-grid')).toBeInTheDocument();
        expect(screen.getByTestId('recharts-tooltip')).toBeInTheDocument();
    });

    it('passes the fetched performance data to the BarChart', async () => {
        const mockData = [
            { name: 'Jan', candidates: 400 },
            { name: 'Feb', candidates: 300 },
            { name: 'Mar', candidates: 600 },
        ];

        getMyPerformance.mockResolvedValue(mockData);
        renderWidget();

        await waitFor(() => {
            expect(screen.queryByText('Loading chart...')).not.toBeInTheDocument();
        });

        const barChart = screen.getByTestId('recharts-bar-chart');

        // Assert that the fetched data was correctly passed to the chart component
        expect(barChart.getAttribute('data-chart-data')).toBe(JSON.stringify(mockData));
    });
});
