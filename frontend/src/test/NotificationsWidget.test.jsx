import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotificationsWidget from '../components/NotificationsWidget';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockInvalidateQueries = vi.fn();
// We'll mutate to verify calls
const mockMutate = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(() => ({ mutate: mockMutate })),
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries,
    }),
}));

import { useQuery } from '@tanstack/react-query';

// We need more than 5 elements to test the pagination "View more" toggle
const mockActivities = Array.from({ length: 6 }).map((_, i) => ({
    id: String(i + 1),
    title: `Activity ${i + 1}`,
    user: i % 2 === 0 ? 'Alice' : 'Bob',
    description: `Description ${i + 1}`,
    timestamp: '2023-10-10T10:00:00Z',
    type: 'candidate_created',
    notification_key: `notif-${i + 1}`
}));

function renderWidget(queryResult = { data: mockActivities, isLoading: false, isError: false }) {
    useQuery.mockReturnValue(queryResult);

    return render(
        <BrowserRouter>
            <NotificationsWidget />
        </BrowserRouter>
    );
}

describe('NotificationsWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays loading state correctly', () => {
        renderWidget({ isLoading: true });
        expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
        renderWidget({ isError: true });
        expect(screen.getByText('Failed to load notifications.')).toBeInTheDocument();
    });

    it('displays empty state when array is empty', () => {
        renderWidget({ data: [], isLoading: false, isError: false });
        expect(screen.getByText('No recent activities')).toBeInTheDocument();
    });

    it('renders exactly 5 notifications initially (when more than 5 exist)', () => {
        renderWidget();
        // Activity 1
        expect(screen.getByText('Description 1')).toBeInTheDocument();
        // Activity 5
        expect(screen.getByText('Description 5')).toBeInTheDocument();

        // Activity 6 should be hidden
        expect(screen.queryByText('Description 6')).not.toBeInTheDocument();
    });

    it('shows "View more" button when more than 5 activities exist, and clicking it displays all', () => {
        renderWidget();

        const viewMoreBtn = screen.getByRole('button', { name: 'View more' });
        expect(viewMoreBtn).toBeInTheDocument();

        fireEvent.click(viewMoreBtn);

        // Activity 6 is now visible
        expect(screen.getByText('Description 6')).toBeInTheDocument();
        // Button text changes
        expect(screen.getByRole('button', { name: 'Show Less' })).toBeInTheDocument();
    });

    it('does not show "View more" button when 5 or fewer activities exist', () => {
        renderWidget({ data: mockActivities.slice(0, 3), isLoading: false, isError: false });
        expect(screen.queryByRole('button', { name: /View more/i })).not.toBeInTheDocument();
    });

    it('calls dismissMut when the X button is clicked on an activity', () => {
        renderWidget();

        const dismissBtns = screen.getAllByTitle('Dismiss notification');
        // We have 5 visible at first
        expect(dismissBtns).toHaveLength(5);

        // Click on the third one (Activity 3 -> notif-3)
        fireEvent.click(dismissBtns[2]);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        expect(mockMutate).toHaveBeenCalledWith('notif-3');
    });

    it('extracts avatar initials dynamically based on actorName', () => {
        renderWidget();

        // Activity 1 is by "Alice"
        expect(screen.getAllByText('A')[0]).toBeInTheDocument();
        // Activity 2 is by "Bob"
        expect(screen.getAllByText('B')[0]).toBeInTheDocument();
    });
});
