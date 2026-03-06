import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobSelector from '../components/JobSelector';

// ─── Mock the jobs API ────────────────────────────────────────────────────────
vi.mock('../api/jobs', () => ({
    getJobs: vi.fn(),
}));

import { getJobs } from '../api/jobs';

const mockJobs = [
    { id: 'job-1', title: 'Frontend Engineer' },
    { id: 'job-2', title: 'Backend Engineer' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSelector(overrides = {}) {
    const onSelect = vi.fn();
    return {
        onSelect,
        ...render(
            <JobSelector
                selectedJobId={null}
                onSelect={onSelect}
                {...overrides}
            />
        ),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getJobs.mockResolvedValue(mockJobs);
    });

    it('renders the default label', async () => {
        renderSelector();
        expect(screen.getByText('Assign to Job (Optional)')).toBeInTheDocument();
    });

    it('accepts a custom label', async () => {
        renderSelector({ label: 'Assign to Job (Add Application)' });
        expect(screen.getByText('Assign to Job (Add Application)')).toBeInTheDocument();
    });

    it('renders the "None" option and all fetched job options in the dropdown', async () => {
        renderSelector();

        // Wait for jobs to load then open the dropdown
        await waitFor(() => expect(getJobs).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('None (Add to Talent Pool)')).toBeInTheDocument();
        expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
        expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });

    it('calls onSelect with the job id when a job option is clicked', async () => {
        const { onSelect } = renderSelector();

        await waitFor(() => expect(getJobs).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button'));
        fireEvent.mouseDown(screen.getByText('Frontend Engineer'));

        expect(onSelect).toHaveBeenCalledWith('job-1');
    });

    it('calls onSelect with null when the "None" option is selected', async () => {
        const { onSelect } = renderSelector({ selectedJobId: 'job-1' });

        await waitFor(() => expect(getJobs).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button'));
        fireEvent.mouseDown(screen.getByText('None (Add to Talent Pool)'));

        expect(onSelect).toHaveBeenCalledWith(null);
    });

    it('shows the pipeline hint when a job is currently selected', async () => {
        renderSelector({ selectedJobId: 'job-1' });

        await waitFor(() =>
            expect(
                screen.getByText(/Candidate will be added to the/i)
            ).toBeInTheDocument()
        );
    });

    it('does not show the pipeline hint when no job is selected', async () => {
        renderSelector({ selectedJobId: null });

        await waitFor(() => expect(getJobs).toHaveBeenCalled());

        expect(
            screen.queryByText(/Candidate will be added to the/i)
        ).not.toBeInTheDocument();
    });

    it('does not crash if getJobs rejects', async () => {
        getJobs.mockRejectedValueOnce(new Error('Network error'));
        renderSelector();

        // No thrown error, dropdown still renders with at least the "None" option
        await waitFor(() => expect(getJobs).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('None (Add to Talent Pool)')).toBeInTheDocument();
    });
});
