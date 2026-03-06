import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyJobsWidget from '../components/MyJobsWidget';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api/jobs', () => ({
    getJobs: vi.fn(),
}));

import { getJobs } from '../api/jobs';

const mockJobs = [
    { id: '1', title: 'Senior Dev', status: 'Published', location: 'London' },
    { id: '2', title: 'Draft Job', status: 'Draft', location: 'Remote' },
    { id: '3', title: 'Product Manager', status: 'Published', location: '' }, // Should default to Remote
    { id: '4', title: 'Designer', status: 'Published', location: 'New York' },
    { id: '5', title: 'QA Engineer', status: 'Published', location: 'Remote' },
    { id: '6', title: 'DevOps', status: 'Published', location: 'Berlin' },
    { id: '7', title: 'Accountant', status: 'Published', location: 'Paris' }, // This 6th published job should be sliced out
];

function renderWidget() {
    return render(
        <BrowserRouter>
            <MyJobsWidget />
        </BrowserRouter>
    );
}

describe('MyJobsWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders a loading pulse initially', () => {
        // We do not await the promise resolution so it stays in loading state
        getJobs.mockReturnValue(new Promise(() => { }));
        const { container } = renderWidget();
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('displays the empty state when no active jobs exist', async () => {
        getJobs.mockResolvedValue([{ id: '1', title: 'Draft Job', status: 'Draft' }]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No active jobs')).toBeInTheDocument();
        });
    });

    it('displays a maximum of 5 published jobs', async () => {
        getJobs.mockResolvedValue(mockJobs);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Active Jobs')).toBeInTheDocument();
        });

        // "Draft Job" shouldn't be here
        expect(screen.queryByText('Draft Job')).not.toBeInTheDocument();

        // "Accountant" shouldn't be here (sliced out)
        expect(screen.queryByText('Accountant')).not.toBeInTheDocument();

        // The first 5 published should be here
        expect(screen.getByText('Senior Dev')).toBeInTheDocument();
        expect(screen.getByText('Product Manager')).toBeInTheDocument();
        expect(screen.getByText('Designer')).toBeInTheDocument();
        expect(screen.getByText('QA Engineer')).toBeInTheDocument();
        expect(screen.getByText('DevOps')).toBeInTheDocument();
    });

    it('defaults location to "Remote" when location is falsy', async () => {
        getJobs.mockResolvedValue([{ id: '3', title: 'Product Manager', status: 'Published', location: '' }]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Remote')).toBeInTheDocument();
        });
    });

    it('navigates to /jobs when "View All" is clicked', async () => {
        getJobs.mockResolvedValue([]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('View All')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('View All'));
        expect(mockNavigate).toHaveBeenCalledWith('/jobs');
    });

    it('navigates to /jobs/:id when a specific job is clicked', async () => {
        getJobs.mockResolvedValue([{ id: '100', title: 'Target Job', status: 'Published' }]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Target Job')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Target Job'));
        expect(mockNavigate).toHaveBeenCalledWith('/jobs/100');
    });

    it('handles getJobs API rejection gracefully', async () => {
        // Suppress console.error in tests
        const spyError = vi.spyOn(console, 'error').mockImplementation(() => { });
        getJobs.mockRejectedValue(new Error('Network error'));
        renderWidget();

        // Should fall back to the empty state after failing to fetch
        await waitFor(() => {
            expect(screen.getByText('No active jobs')).toBeInTheDocument();
        });

        spyError.mockRestore();
    });
});
