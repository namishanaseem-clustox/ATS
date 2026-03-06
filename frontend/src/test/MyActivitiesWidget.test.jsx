import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyActivitiesWidget from '../components/MyActivitiesWidget';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api/activities', () => ({
    getMyInterviews: vi.fn(),
}));

import { getMyInterviews } from '../api/activities';

const mockActivities = [
    {
        id: '1', title: 'Tech Screen', status: 'Pending', activity_type: 'Interview',
        scheduled_at: '2023-10-15T10:00:00Z', candidate: { id: 'c1', first_name: 'Alice', last_name: 'A' }
    },
    {
        id: '2', title: 'Completed Call', status: 'Completed', activity_type: 'Call',
        scheduled_at: '2023-10-14T10:00:00Z', candidate: { id: 'c2', first_name: 'Bob', last_name: 'B' }
    }, // Should be filtered out
    {
        id: '3', title: 'Phone Screen', status: 'Pending', activity_type: 'Call',
        scheduled_at: '2023-10-12T10:00:00Z', candidate: { id: 'c3', first_name: 'Charlie', last_name: 'C' }
    }, // Earliest
    {
        id: '4', title: 'Team Sync', status: 'Pending', activity_type: 'Meeting',
        scheduled_at: '2023-10-16T10:00:00Z' // No candidate attached
    },
    {
        id: '5', title: 'Culture Fit', status: 'Pending', activity_type: 'Interview',
        scheduled_at: '2023-10-17T10:00:00Z', candidate: { id: 'c5', first_name: 'Eve', last_name: 'E' }
    },
    {
        id: '6', title: 'Offer Call', status: 'Pending', activity_type: 'Call',
        scheduled_at: '2023-10-18T10:00:00Z', candidate: { id: 'c6', first_name: 'Frank', last_name: 'F' }
    },
    {
        id: '7', title: 'Late Meeting', status: 'Pending', activity_type: 'Meeting',
        scheduled_at: '2023-10-20T10:00:00Z', candidate: { id: 'c7', first_name: 'Grace', last_name: 'G' }
    }, // 6th pending activity, should be sliced out
];

function renderWidget() {
    return render(
        <BrowserRouter>
            <MyActivitiesWidget />
        </BrowserRouter>
    );
}

describe('MyActivitiesWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading pulse initially', () => {
        getMyInterviews.mockReturnValue(new Promise(() => { }));
        const { container } = renderWidget();
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('displays the empty state when no pending activities exist', async () => {
        getMyInterviews.mockResolvedValue([{ id: '1', title: 'Done', status: 'Completed', scheduled_at: '2023-10-10T10:00:00Z' }]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No pending activities')).toBeInTheDocument();
        });
    });

    it('displays a maximum of 5 pending activities, sorted chronologically ascending', async () => {
        getMyInterviews.mockResolvedValue(mockActivities);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('MY ACTIVITIES')).toBeInTheDocument();
        });

        // Completed item shouldn't be here
        expect(screen.queryByText('Completed Call')).not.toBeInTheDocument();
        // 6th pending item shouldn't be here
        expect(screen.queryByText('Late Meeting')).not.toBeInTheDocument();

        // Check order loosely by looking for TITLES
        const titles = screen.getAllByText(/Tech Screen|Phone Screen|Team Sync|Culture Fit|Offer Call/);
        // Expected order: Phone Screen (12th), Tech Screen (15th), Team Sync (16th), Culture Fit (17th), Offer Call (18th)
        expect(titles[0].textContent.trim()).toBe('Phone Screen');
        expect(titles[1].textContent.trim()).toBe('Tech Screen');
        expect(titles[2].textContent.trim()).toBe('Team Sync');
        expect(titles[3].textContent.trim()).toBe('Culture Fit');
        expect(titles[4].textContent.trim()).toBe('Offer Call');
    });

    it('renders candidate details when available, or skips if missing', async () => {
        getMyInterviews.mockResolvedValue([mockActivities[0], mockActivities[3]]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Tech Screen')).toBeInTheDocument();
        });

        // Activity 1 has a candidate
        expect(screen.getByText('w/ Alice A')).toBeInTheDocument();

        // Activity 4 does NOT have a candidate, so no "w/" text should append for Team Sync
        // We ensure "w/" occurs only once in the document because only Alice is rendered
        const withTexts = screen.getAllByText(/w\//);
        expect(withTexts).toHaveLength(1);
    });

    it('navigates to /tasks when "View more" is clicked', async () => {
        getMyInterviews.mockResolvedValue([]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('View more')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('View more'));
        expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    });

    it('navigates to /jobs when "Schedule something" is clicked in empty state', async () => {
        getMyInterviews.mockResolvedValue([]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Schedule something')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Schedule something'));
        expect(mockNavigate).toHaveBeenCalledWith('/jobs');
    });

    it('navigates to candidate profile -> activities tab when an activity WITH a candidate is clicked', async () => {
        getMyInterviews.mockResolvedValue([mockActivities[0]]); // Has candidate ID 'c1'
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Tech Screen')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Tech Screen'));
        expect(mockNavigate).toHaveBeenCalledWith('/candidates/c1?tab=activities');
    });

    it('navigates to generic /tasks when an activity WITHOUT a candidate is clicked', async () => {
        getMyInterviews.mockResolvedValue([mockActivities[3]]); // Team Sync, no candidate attached
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('Team Sync')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Team Sync'));
        expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    });

    it('handles api errors gracefully and shows empty state', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        getMyInterviews.mockRejectedValue(new Error('API failure'));

        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No pending activities')).toBeInTheDocument();
        });

        spy.mockRestore();
    });
});
