import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Notifications from '../components/Notifications';

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

// We don't directly test the network call in the component test, but mock the hook data
import { useQuery } from '@tanstack/react-query';

const mockActivities = [
    {
        id: '1',
        title: 'New Candidate',
        description: 'Alice applied',
        timestamp: '2023-10-10T10:00:00Z',
        type: 'candidate_created',
        notification_key: 'notif-1'
    },
    {
        id: '2',
        title: 'Job Created',
        description: 'A new job was posted',
        timestamp: '2023-10-11T12:00:00Z',
        type: 'job_created',
        notification_key: 'notif-2'
    }
];

function renderNotifications(queryResult = { data: mockActivities, isLoading: false }) {
    useQuery.mockReturnValue(queryResult);

    return render(
        <BrowserRouter>
            <Notifications />
        </BrowserRouter>
    );
}

describe('Notifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the bell icon with an unread badge initially', () => {
        renderNotifications();
        const btn = screen.getByTitle('Notifications');
        expect(btn).toBeInTheDocument();

        // Two unread activities -> red badge should be there
        // The badge is a span with specific classes
        const badge = btn.querySelector('.bg-red-500');
        expect(badge).toBeInTheDocument();
    });

    it('toggles the dropdown when clicking the bell icon', () => {
        renderNotifications();
        const btn = screen.getByTitle('Notifications');

        // Closed initially
        expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();

        // Open
        fireEvent.click(btn);
        expect(screen.getByText('Mark all read')).toBeInTheDocument();
        expect(screen.getByText('New Candidate')).toBeInTheDocument();

        // Close
        fireEvent.click(btn);
        expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('displays loading state when isLoading is true', () => {
        renderNotifications({ data: undefined, isLoading: true });
        fireEvent.click(screen.getByTitle('Notifications'));
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays empty state when activities is empty', () => {
        renderNotifications({ data: [], isLoading: false });
        fireEvent.click(screen.getByTitle('Notifications'));
        expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('marks a notification as read and closes dropdown when a notification link is clicked', () => {
        renderNotifications();
        fireEvent.click(screen.getByTitle('Notifications'));

        const candidateLink = screen.getByText('New Candidate');
        fireEvent.click(candidateLink);

        // Dropdown closes
        expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();

        // Reopen to verify one is read (unread class removed)
        fireEvent.click(screen.getByTitle('Notifications'));
        // The title of candidate 1 shouldn't have 'font-semibold' and 'text-gray-900', but 'font-medium'
        const candidateHeading = screen.getByText('New Candidate');
        expect(candidateHeading.className).toContain('font-medium text-gray-700');

        // The second one is still unread
        const jobHeading = screen.getByText('Job Created');
        expect(jobHeading.className).toContain('font-semibold text-gray-900');
    });

    it('calls dismissMutation when the X button is clicked', () => {
        renderNotifications();
        fireEvent.click(screen.getByTitle('Notifications'));

        // Grab all dismiss buttons
        const dismissBtns = screen.getAllByTitle('Dismiss notification');
        expect(dismissBtns).toHaveLength(2);

        // Click the first one (notif-1)
        fireEvent.click(dismissBtns[0]);

        expect(mockMutate).toHaveBeenCalledTimes(1);
        expect(mockMutate).toHaveBeenCalledWith('notif-1');
    });

    it('marks all as read and removes badge when "Mark all read" is clicked', () => {
        renderNotifications();
        const btn = screen.getByTitle('Notifications');

        // Verify badge exists
        expect(btn.querySelector('.bg-red-500')).toBeInTheDocument();

        fireEvent.click(btn);
        fireEvent.click(screen.getByText('Mark all read'));

        // Badge is gone
        expect(btn.querySelector('.bg-red-500')).not.toBeInTheDocument();

        // "Mark all read" button hides when nothing is unread
        expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });
});
