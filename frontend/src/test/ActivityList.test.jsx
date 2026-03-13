import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivityList from '../components/ActivityList';
import * as activitiesApi from '../api/activities';
import * as authContext from '../context/AuthContext';

vi.mock('../api/activities');
vi.mock('../context/AuthContext');
vi.mock('../components/ActivityModal', () => ({
    default: ({ isOpen, onClose, activity, onSave }) => (
        isOpen ? (
            <div data-testid="activity-modal">
                <span>ActivityModal for {activity?.id || 'new'}</span>
                <button onClick={() => onSave({ id: 'saved-1' })}>Save</button>
                <button onClick={onClose}>Close Modal</button>
            </div>
        ) : null
    )
}));
vi.mock('../components/ScorecardModal', () => ({
    default: ({ isOpen, onClose, activity, onSave }) => (
        isOpen ? (
            <div data-testid="scorecard-modal">
                <span>ScorecardModal for {activity?.id}</span>
                <button onClick={() => onSave()}>Submit Scorecard</button>
                <button onClick={onClose}>Close Scorecard</button>
            </div>
        ) : null
    )
}));

describe('ActivityList Component', () => {
    const mockActivities = [
        {
            id: 'act-1',
            activity_type: 'Interview',
            title: 'Technical Interview',
            status: 'Pending',
            scheduled_at: '2024-01-20T10:00:00Z',
            location: 'Office Room 1',
            participants: ['John Doe', 'Jane Smith'],
            candidate: { first_name: 'Alice', last_name: 'Johnson' },
            job: { title: 'Senior Developer' },
            creator: { full_name: 'HR Manager', email: 'hr@example.com' }
        },
        {
            id: 'act-2',
            activity_type: 'Call',
            title: 'Phone Screen',
            status: 'Completed',
            scheduled_at: '2024-01-15T14:00:00Z',
            location: null,
            participants: [],
            candidate: null,
            job: null,
            creator: null
        },
        {
            id: 'act-3',
            activity_type: 'Note',
            title: 'Internal Note',
            status: 'Pending',
            scheduled_at: '2024-01-18T09:00:00Z',
            location: 'N/A',
            participants: [],
            candidate: null,
            job: null,
            creator: null
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        authContext.useAuth.mockReturnValue({
            user: { id: 'u1', role: 'hr' }
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        window.confirm.mockRestore?.();
    });

    it('shows loading state initially', () => {
        activitiesApi.getJobActivities.mockReturnValue(new Promise(() => { }));
        render(<ActivityList jobId="job-123" />);

        expect(screen.getByText(/Loading activities.../i)).toBeInTheDocument();
    });

    it('fetches job activities when jobId is provided', async () => {
        activitiesApi.getJobActivities.mockResolvedValue(mockActivities);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledWith('job-123');
        });
    });

    it('fetches candidate activities when candidateId is provided', async () => {
        activitiesApi.getCandidateActivities.mockResolvedValue(mockActivities);
        render(<ActivityList candidateId="cand-456" />);

        await waitFor(() => {
            expect(activitiesApi.getCandidateActivities).toHaveBeenCalledWith('cand-456');
        });
    });

    it('filters out Note type activities from the list', async () => {
        activitiesApi.getJobActivities.mockResolvedValue(mockActivities);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
            expect(screen.getByText('Phone Screen')).toBeInTheDocument();
            expect(screen.queryByText('Internal Note')).not.toBeInTheDocument();
        });
    });

    it('sorts activities by scheduled_at descending', async () => {
        activitiesApi.getJobActivities.mockResolvedValue(mockActivities);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            // After sort desc and Note filter: Technical Interview (Jan 20) first, Phone Screen (Jan 15) second
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
            expect(screen.getByText('Phone Screen')).toBeInTheDocument();
        });

        // Verify order in DOM via getAllByText returns elements in document order
        const allTitles = screen.getAllByText(/Technical Interview|Phone Screen/);
        expect(allTitles[0]).toHaveTextContent('Technical Interview');
        expect(allTitles[1]).toHaveTextContent('Phone Screen');
    });

    it('shows empty state when no activities', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/No activities scheduled/i)).toBeInTheDocument();
        });
    });

    it('renders Add Activity button', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/Add Activity/i)).toBeInTheDocument();
        });
    });

    it('opens ActivityModal when Add Activity is clicked', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            const addButton = screen.getByText(/Add Activity/i);
            fireEvent.click(addButton);
        });

        expect(screen.getByTestId('activity-modal')).toBeInTheDocument();
        expect(screen.getByText('ActivityModal for new')).toBeInTheDocument();
    });

    it('opens ActivityModal when edit button is clicked', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            const editButtons = screen.getAllByRole('button');
            const editButton = editButtons.find(btn => btn.querySelector('svg.lucide-edit-2') || btn.className.includes('text-indigo-600'));
            fireEvent.click(editButton);
        });

        expect(screen.getByTestId('activity-modal')).toBeInTheDocument();
    });

    it('opens ScorecardModal when Submit Scorecard is clicked', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            const scorecardButton = screen.getByText(/Submit Scorecard/i);
            fireEvent.click(scorecardButton);
        });

        expect(screen.getByTestId('scorecard-modal')).toBeInTheDocument();
    });

    it('shows Submit Scorecard button only for Interview, Call, Meeting, Task types', async () => {
        const activities = [
            { ...mockActivities[0], activity_type: 'Interview' },
            { ...mockActivities[1], activity_type: 'Call' },
            { id: 'act-4', activity_type: 'Meeting', title: 'Team Meeting', scheduled_at: '2024-01-19T10:00:00Z', status: 'Pending', participants: [] },
            { id: 'act-5', activity_type: 'Task', title: 'Review Resume', scheduled_at: '2024-01-18T10:00:00Z', status: 'Pending', participants: [] }
        ];

        activitiesApi.getJobActivities.mockResolvedValue(activities);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            const scorecardButtons = screen.getAllByText(/Submit Scorecard/i);
            expect(scorecardButtons).toHaveLength(4);
        });
    });

    it('deletes activity when delete button is clicked and confirmed', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        activitiesApi.deleteActivity.mockResolvedValue({});

        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(btn => btn.querySelector('svg.lucide-trash-2'));
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this activity?');
            expect(activitiesApi.deleteActivity).toHaveBeenCalledWith('act-1');
        });

        await waitFor(() => {
            expect(screen.queryByText('Technical Interview')).not.toBeInTheDocument();
        });
    });

    it('does not delete when confirmation is cancelled', async () => {
        window.confirm.mockReturnValue(false);
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);

        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(btn => btn.querySelector('svg.lucide-trash-2'));
        fireEvent.click(deleteButton);

        expect(activitiesApi.deleteActivity).not.toHaveBeenCalled();
        expect(screen.getByText('Technical Interview')).toBeInTheDocument();
    });

    it('hides delete button for interviewer role', async () => {
        authContext.useAuth.mockReturnValue({
            user: { id: 'u1', role: 'interviewer' }
        });

        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            const deleteButtons = screen.queryAllByRole('button').filter(btn => btn.querySelector('svg.lucide-trash-2'));
            expect(deleteButtons).toHaveLength(0);
        });
    });

    it('refreshes activities after save from ActivityModal', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            fireEvent.click(screen.getByText(/Add Activity/i));
        });

        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledTimes(2);
        });
    });

    it('refreshes activities after scorecard submission', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        // Open scorecard modal by clicking Submit Scorecard in the activity list
        await waitFor(() => {
            fireEvent.click(screen.getByText(/Submit Scorecard/i));
        });

        // Scorecard modal should now be open; click its 'Submit Scorecard' button
        expect(screen.getByTestId('scorecard-modal')).toBeInTheDocument();

        // The mock ScorecardModal has its own 'Submit Scorecard' button
        fireEvent.click(screen.getByTestId('scorecard-modal').querySelector('button'));

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledTimes(2);
        });
    });

    it('displays correct icons for different activity types', async () => {
        const activities = [
            { id: '1', activity_type: 'Meeting', title: 'Meeting', scheduled_at: '2024-01-20T10:00:00Z', status: 'Pending', participants: [] },
            { id: '2', activity_type: 'Interview', title: 'Interview', scheduled_at: '2024-01-19T10:00:00Z', status: 'Pending', participants: [] },
            { id: '3', activity_type: 'Call', title: 'Call', scheduled_at: '2024-01-18T10:00:00Z', status: 'Pending', participants: [] }
        ];

        activitiesApi.getJobActivities.mockResolvedValue(activities);
        const { container } = render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(container.querySelector('.text-blue-500')).toBeInTheDocument(); // Meeting
            expect(container.querySelector('.text-purple-500')).toBeInTheDocument(); // Interview
            expect(container.querySelector('.text-green-500')).toBeInTheDocument(); // Call
        });
    });

    it('renders status badges with correct colors', async () => {
        const activities = [
            { id: '1', activity_type: 'Call', title: 'Call 1', status: 'Pending', scheduled_at: '2024-01-20T10:00:00Z', participants: [] },
            { id: '2', activity_type: 'Call', title: 'Call 2', status: 'Completed', scheduled_at: '2024-01-19T10:00:00Z', participants: [] },
            { id: '3', activity_type: 'Call', title: 'Call 3', status: 'Cancelled', scheduled_at: '2024-01-18T10:00:00Z', participants: [] }
        ];

        activitiesApi.getJobActivities.mockResolvedValue(activities);
        const { container } = render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(container.querySelector('.bg-yellow-100')).toBeInTheDocument(); // Pending
            expect(container.querySelector('.bg-green-100')).toBeInTheDocument(); // Completed
            expect(container.querySelector('.bg-red-100')).toBeInTheDocument(); // Cancelled
        });
    });

    it('displays candidate name when in job context', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });
    });

    it('does not display candidate name when in candidate context', async () => {
        activitiesApi.getCandidateActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList candidateId="cand-456" />);

        await waitFor(() => {
            expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
        });
    });

    it('displays job title when in candidate context', async () => {
        activitiesApi.getCandidateActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList candidateId="cand-456" />);

        await waitFor(() => {
            expect(screen.getByText('Senior Developer')).toBeInTheDocument();
        });
    });

    it('does not display job title when in job context', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.queryByText('Senior Developer')).not.toBeInTheDocument();
        });
    });

    it('displays participants or "No participants" fallback', async () => {
        const activityWithNoParticipants = { ...mockActivities[0], id: 'act-no-part', participants: [] };
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0], activityWithNoParticipants]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/John Doe, Jane Smith/i)).toBeInTheDocument();
            expect(screen.getByText(/No participants/i)).toBeInTheDocument();
        });
    });

    it('displays location or "Remote" fallback', async () => {
        const activityWithNoLocation = { ...mockActivities[0], id: 'act-no-loc', location: null };
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0], activityWithNoLocation]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/Office Room 1/i)).toBeInTheDocument();
            expect(screen.getByText(/Remote/i)).toBeInTheDocument();
        });
    });

    it('displays creator information when available', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/Added by\s*HR Manager/i)).toBeInTheDocument();
        });
    });

    it('displays creator email when full_name is not available', async () => {
        const activity = {
            ...mockActivities[0],
            creator: { email: 'creator@example.com' }
        };
        activitiesApi.getJobActivities.mockResolvedValue([activity]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/Added by creator@example.com/i)).toBeInTheDocument();
        });
    });

    it('does not display creator info when creator is null', async () => {
        const activityWithNoCreator = { ...mockActivities[0], id: 'act-no-creator', creator: null };
        activitiesApi.getJobActivities.mockResolvedValue([activityWithNoCreator]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.queryByText(/Added by/i)).not.toBeInTheDocument();
        });
    });

    it('formats scheduled_at correctly', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            const dateElement = screen.getByText(/1\/20\/2024|20\/1\/2024/);
            expect(dateElement).toBeInTheDocument();
        });
    });

    it('handles unscheduled activities', async () => {
        const unscheduled = { ...mockActivities[0], scheduled_at: null };
        activitiesApi.getJobActivities.mockResolvedValue([unscheduled]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Unscheduled')).toBeInTheDocument();
        });
    });

    it('handles API errors gracefully', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        activitiesApi.getJobActivities.mockRejectedValue(new Error('API Error'));

        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/No activities scheduled/i)).toBeInTheDocument();
        });
    });

    it('handles delete API errors gracefully', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        activitiesApi.deleteActivity.mockRejectedValue(new Error('Delete failed'));

        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(btn => btn.querySelector('svg.lucide-trash-2'));
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(activitiesApi.deleteActivity).toHaveBeenCalled();
            expect(screen.getByText('Technical Interview')).toBeInTheDocument();
        });
    });

    it('closes ScorecardModal and resets state', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockActivities[0]]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            fireEvent.click(screen.getByText(/Submit Scorecard/i));
        });

        expect(screen.getByTestId('scorecard-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Close Scorecard'));

        await waitFor(() => {
            expect(screen.queryByTestId('scorecard-modal')).not.toBeInTheDocument();
        });
    });

    it('closes ActivityModal properly', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);
        render(<ActivityList jobId="job-123" />);

        await waitFor(() => {
            fireEvent.click(screen.getByText(/Add Activity/i));
        });

        fireEvent.click(screen.getByText('Close Modal'));

        await waitFor(() => {
            expect(screen.queryByTestId('activity-modal')).not.toBeInTheDocument();
        });
    });
});
