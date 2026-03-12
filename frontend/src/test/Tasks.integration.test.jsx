import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Tasks from '../pages/Tasks';
import { AuthProvider } from '../context/AuthContext';
import * as activitiesApi from '../api/activities';

// Mock components
vi.mock('../components/ScorecardModal', () => ({
    default: ({ isOpen, onClose, activity }) => isOpen ? (
        <div data-testid="scorecard-modal">
            <span>Scorecard for {activity.title}</span>
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

vi.mock('../components/ActivityModal', () => ({
    default: ({ isOpen, onClose, activity }) => isOpen ? (
        <div data-testid="activity-modal">
            <span>{activity ? 'Edit' : 'Create'} Activity</span>
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

vi.mock('../components/CalendarView', () => ({
    default: () => <div data-testid="calendar-view" />
}));

vi.mock('../components/Breadcrumb', () => ({
    default: () => <div data-testid="breadcrumb" />
}));

vi.mock('../api/activities');

const mockActivities = [
    {
        id: 'act-1',
        title: 'Initial Interview',
        activity_type: 'Interview',
        status: 'Scheduled',
        scheduled_at: new Date().toISOString(),
        candidate: { first_name: 'Jane', last_name: 'Smith' },
        job: { title: 'Frontend Developer' },
        assignees: [{ full_name: 'Test User' }]
    },
    {
        id: 'act-2',
        title: 'Lunch Break',
        activity_type: 'Other',
        status: 'Completed',
        scheduled_at: new Date().toISOString(),
        assignees: []
    }
];

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: () => mockUseAuth(),
}));

const renderTasks = (userRole = 'owner') => {
    mockUseAuth.mockReturnValue({
        user: { id: 'u1', role: userRole, full_name: 'Test User' },
        loading: false,
        isAuthenticated: true,
    });

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <Tasks />
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe('Tasks Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activitiesApi.getAllActivities.mockResolvedValue(mockActivities);
        window.confirm = vi.fn(() => true);
    });

    it('renders activities list successfully', async () => {
        renderTasks();

        await waitFor(() => expect(screen.getByText('Initial Interview')).toBeInTheDocument());
        expect(screen.getByText('Lunch Break')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    });

    it('filters activities by search query', async () => {
        const user = userEvent.setup();
        renderTasks();

        await waitFor(() => screen.getByPlaceholderText(/Search by Name/i));
        const searchInput = screen.getByPlaceholderText(/Search by Name/i);

        await user.type(searchInput, 'Initial');

        expect(screen.getByText('Initial Interview')).toBeInTheDocument();
        expect(screen.queryByText('Lunch Break')).not.toBeInTheDocument();
    });

    it('shows Submit Scorecard button only for valid activity types', async () => {
        renderTasks();

        await waitFor(() => screen.getByText('Initial Interview'));

        // Initial Interview is an "Interview", should have the button
        const interviewRow = screen.getByText('Initial Interview').closest('tr');
        expect(within(interviewRow).getByTitle('Submit Scorecard')).toBeInTheDocument();

        // Lunch Break is "Other", should NOT have the button
        const otherRow = screen.getByText('Lunch Break').closest('tr');
        expect(within(otherRow).queryByTitle('Submit Scorecard')).not.toBeInTheDocument();
    });

    it('opens scorecard modal on click', async () => {
        const user = userEvent.setup();
        renderTasks();

        await waitFor(() => screen.getByTitle('Submit Scorecard'));
        await user.click(screen.getByTitle('Submit Scorecard'));

        expect(screen.getByTestId('scorecard-modal')).toBeInTheDocument();
        expect(screen.getByText('Scorecard for Initial Interview')).toBeInTheDocument();
    });

    it('hides Create activity button for interviewers', async () => {
        renderTasks('interviewer');

        await waitFor(() => screen.getByText('Activities'));
        expect(screen.queryByText('+ Create activity')).not.toBeInTheDocument();
    });

    it('shows Create activity button for owners', async () => {
        renderTasks('owner');

        await waitFor(() => screen.getByText('+ Create activity'));
        expect(screen.getByText('+ Create activity')).toBeInTheDocument();
    });

    it('handles activity deletion', async () => {
        const user = userEvent.setup();
        activitiesApi.deleteActivity.mockResolvedValue({ success: true });
        renderTasks();

        await waitFor(() => screen.getAllByTitle('Delete')[0]);
        await user.click(screen.getAllByTitle('Delete')[0]);

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this activity?');
        expect(activitiesApi.deleteActivity).toHaveBeenCalledWith('act-1');
    });

    it('opens activity modal for editing', async () => {
        const user = userEvent.setup();
        renderTasks();

        await waitFor(() => screen.getAllByTitle('View')[0]);
        await user.click(screen.getAllByTitle('View')[0]);

        expect(screen.getByTestId('activity-modal')).toBeInTheDocument();
        expect(screen.getByText('Edit Activity')).toBeInTheDocument();
    });

    it('calculates duration correctly when end_time is provided', async () => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        const activitiesWithEnd = [
            {
                ...mockActivities[0],
                scheduled_at: now.toISOString(),
                end_time: oneHourLater
            }
        ];
        activitiesApi.getAllActivities.mockResolvedValue(activitiesWithEnd);
        renderTasks();

        await waitFor(() => expect(screen.getByText('1 Hour')).toBeInTheDocument());
    });

    it('filters by type using FilterPanel', async () => {
        const user = userEvent.setup();
        renderTasks();

        await waitFor(() => screen.getByText('Initial Interview'));

        const filterButton = screen.getByRole('button', { name: /Filter/i });
        await user.click(filterButton);

        // Find the "Interview" checkbox
        const interviewCheckbox = screen.getByLabelText(/Interview/i);
        await user.click(interviewCheckbox);

        expect(screen.getByText('Initial Interview')).toBeInTheDocument();
        expect(screen.queryByText('Lunch Break')).not.toBeInTheDocument();
    });

    it('switches between list and board (calendar) views', async () => {
        const user = userEvent.setup();
        renderTasks();

        await waitFor(() => screen.getByRole('button', { name: /Board/i }));
        await user.click(screen.getByRole('button', { name: /Board/i }));

        expect(screen.getByTestId('calendar-view')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /List/i }));
        expect(screen.getByText('Initial Interview')).toBeInTheDocument();
    });
});
