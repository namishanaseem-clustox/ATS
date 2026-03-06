import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobCard from '../components/JobCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Sample mock data for a job
const mockJob = {
    id: 'job-123',
    title: 'Senior Frontend Engineer',
    job_code: 'ENG-001',
    status: 'Published',
    location: 'Remote',
    employment_type: 'Full-time',
    headcount: 3,
    created_at: '2023-10-15T00:00:00.000Z',
    department: {
        id: 'dept-123',
        name: 'Engineering',
    },
};

function renderCard(overrideProps = {}) {
    const onClick = vi.fn();
    return {
        ...render(<JobCard job={{ ...mockJob, ...overrideProps }} onClick={onClick} />),
        onClick,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobCard', () => {
    it('renders the core job details (title, code, simple strings)', () => {
        renderCard();
        expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
        expect(screen.getByText('ENG-001')).toBeInTheDocument();
        expect(screen.getByText('Remote')).toBeInTheDocument();
        expect(screen.getByText('Full-time')).toBeInTheDocument();
        expect(screen.getByText('3 Openings')).toBeInTheDocument();
    });

    // ─── Status Badge ───────────────────────────────────────────────────────────

    it('renders a Published status with green styling', () => {
        renderCard({ status: 'Published' });
        const badge = screen.getByText('Published');
        expect(badge).toHaveClass('bg-green-100');
    });

    it('renders an unknown status with fallback grey styling', () => {
        renderCard({ status: 'UnknownState' });
        const badge = screen.getByText('UnknownState');
        expect(badge).toHaveClass('bg-gray-100');
    });

    // ─── Formatting ─────────────────────────────────────────────────────────────

    it('formats the created_at date to a local date string', () => {
        renderCard({ created_at: '2023-10-15T10:00:00.000Z' });
        // the output depends on the local timezone of the test runner, but it will
        // contain the string "Posted " followed by the DateString representation.
        // Instead of exactly guessing the string format across all locales, we look for the element prefix:
        const element = screen.getByText(/^Posted /);
        expect(element).toBeInTheDocument();
    });

    // ─── Card Click ─────────────────────────────────────────────────────────────

    it('fires the onClick prop when the main card is clicked', async () => {
        const { onClick } = renderCard();
        // Wrap the text element to click the container by finding the closest card boundary.
        // Easiest is to click the title text which propagates up.
        await userEvent.click(screen.getByText('Senior Frontend Engineer'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    // ─── Department Display Variations ──────────────────────────────────────────

    it('renders a department button when a department object exists', () => {
        renderCard({ department: { id: 'd-1', name: 'Sales' } });
        const deptBtn = screen.getByRole('button', { name: 'Sales' });
        expect(deptBtn).toBeInTheDocument();
        expect(deptBtn).toHaveClass('bg-green-50'); // specific styling for whole objects
    });

    it('renders a fallback department ID label when only department_id exists', () => {
        renderCard({ department: null, department_id: '1234567890abcdef' });
        // Renders as a span, heavily truncated with ellipses
        expect(screen.getByText('Dept: 12345678...')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders no department info if neither exist', () => {
        renderCard({ department: null, department_id: null });
        expect(screen.queryByText(/Dept:/)).not.toBeInTheDocument();
        // Buttons are only used for full department objects, so none should exist
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('prevents event propagation when clicking the department filter button', async () => {
        const { onClick } = renderCard({ department: { id: 'd-1', name: 'Sales' } });

        // Clicking the department button should NOT fire the overall card's onClick
        const deptBtn = screen.getByRole('button', { name: 'Sales' });
        await userEvent.click(deptBtn);

        expect(onClick).not.toHaveBeenCalled();
    });
});
