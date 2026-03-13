import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarView from '../components/CalendarView';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// ActivityModal — path must match what CalendarView imports (../components/ActivityModal)
vi.mock('../components/ActivityModal', () => ({
    default: ({ isOpen, onClose, onSave, activity }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="activity-modal">
                <span>{activity?.title}</span>
                <button onClick={onClose}>Close Modal</button>
                <button onClick={() => onSave(activity)}>Save Modal</button>
            </div>
        );
    },
}));

// Capture BigCalendar props so we can invoke callbacks directly
let capturedProps = {};
vi.mock('react-big-calendar', () => ({
    Calendar: (props) => {
        capturedProps = props;
        const ToolbarComponent = props.components?.toolbar;
        const EventComponent = props.components?.event;
        return (
            <div data-testid="big-calendar">
                {ToolbarComponent && (
                    <ToolbarComponent
                        date={props.date instanceof Date ? props.date : new Date()}
                        view={props.view}
                        onNavigate={props.onNavigate}
                        onView={props.onView}
                    />
                )}
                {props.events?.map((event) => (
                    <div
                        key={event.id}
                        data-testid={`event-${event.id}`}
                        onClick={() => props.onSelectEvent(event)}
                    >
                        {EventComponent && <EventComponent event={event} />}
                    </div>
                ))}
            </div>
        );
    },
    dateFnsLocalizer: () => ({}),
}));

vi.mock('react-big-calendar/lib/css/react-big-calendar.css', () => ({}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeActivity = (overrides = {}) => ({
    id: '1',
    title: 'Interview with John',
    activity_type: 'Interview',
    scheduled_at: '2024-06-15T10:00:00Z',
    job_id: 'job-1',
    candidate_id: 'cand-1',
    candidate: { first_name: 'John', last_name: 'Doe' },
    ...overrides,
});

const allTypeActivities = [
    makeActivity({ id: '1', activity_type: 'Interview', title: 'Interview' }),
    makeActivity({ id: '2', activity_type: 'Call', title: 'Call' }),
    makeActivity({ id: '3', activity_type: 'Meeting', title: 'Meeting' }),
    makeActivity({ id: '4', activity_type: 'Task', title: 'Task' }),
    makeActivity({ id: '5', activity_type: 'Note', title: 'Note' }),
    makeActivity({ id: '6', activity_type: 'Other', title: 'Other' }),
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderCalendar(activities = [], onRefresh = vi.fn()) {
    return render(<CalendarView activities={activities} onRefresh={onRefresh} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedProps = {};
    });

    // ─── Rendering ─────────────────────────────────────────────────────────────

    it('renders the calendar container', () => {
        renderCalendar([]);
        expect(screen.getByTestId('big-calendar')).toBeInTheDocument();
    });

    it('filters out activities without scheduled_at', () => {
        const activities = [
            makeActivity({ id: '1', scheduled_at: '2024-06-15T10:00:00Z' }),
            makeActivity({ id: '2', scheduled_at: null }),
            makeActivity({ id: '3', scheduled_at: undefined }),
        ];
        renderCalendar(activities);
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
        expect(screen.queryByTestId('event-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('event-3')).not.toBeInTheDocument();
    });

    it('uses activity_type as title when title is missing', () => {
        renderCalendar([makeActivity({ title: null, activity_type: 'Call' })]);
        expect(capturedProps.events[0].title).toBe('Call');
    });

    // ─── CustomEvent icons ──────────────────────────────────────────────────────

    it('renders all activity type icons without crashing', () => {
        renderCalendar(allTypeActivities);
        allTypeActivities.forEach(a => {
            expect(screen.getByTestId(`event-${a.id}`)).toBeInTheDocument();
        });
    });

    it('renders candidate name when candidate is present', () => {
        renderCalendar([makeActivity()]);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('does not render candidate name when candidate is null', () => {
        renderCalendar([makeActivity({ candidate: null })]);
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    // ─── eventPropGetter colors ─────────────────────────────────────────────────

    it('returns correct background color for each activity type', () => {
        renderCalendar(allTypeActivities);
        const getter = capturedProps.eventPropGetter;
        expect(getter({ resource: { activity_type: 'Interview' } }).style.backgroundColor).toBe('#8b5cf6');
        expect(getter({ resource: { activity_type: 'Call' } }).style.backgroundColor).toBe('#3b82f6');
        expect(getter({ resource: { activity_type: 'Meeting' } }).style.backgroundColor).toBe('#f97316');
        expect(getter({ resource: { activity_type: 'Task' } }).style.backgroundColor).toBe('#10b981');
        expect(getter({ resource: { activity_type: 'Note' } }).style.backgroundColor).toBe('#64748b');
        expect(getter({ resource: { activity_type: 'Other' } }).style.backgroundColor).toBe('#6b7280');
    });

    // ─── Event selection → modal ────────────────────────────────────────────────

    it('opens ActivityModal when an event is clicked', () => {
        renderCalendar([makeActivity()]);
        fireEvent.click(screen.getByTestId('event-1'));
        expect(screen.getByTestId('activity-modal')).toBeInTheDocument();
    });

    it('closes ActivityModal when onClose is called', () => {
        renderCalendar([makeActivity()]);
        fireEvent.click(screen.getByTestId('event-1'));
        fireEvent.click(screen.getByRole('button', { name: 'Close Modal' }));
        expect(screen.queryByTestId('activity-modal')).not.toBeInTheDocument();
    });

    it('calls onRefresh when activity is saved and onRefresh is provided', () => {
        const onRefresh = vi.fn();
        renderCalendar([makeActivity()], onRefresh);
        fireEvent.click(screen.getByTestId('event-1'));
        fireEvent.click(screen.getByRole('button', { name: 'Save Modal' }));
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onRefresh is not provided', () => {
        render(<CalendarView activities={[makeActivity()]} />);
        fireEvent.click(screen.getByTestId('event-1'));
        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Save Modal' }));
        }).not.toThrow();
    });

    it('does not render ActivityModal when no activity is selected', () => {
        renderCalendar([makeActivity()]);
        expect(screen.queryByTestId('activity-modal')).not.toBeInTheDocument();
    });

    // ─── CustomToolbar navigation ───────────────────────────────────────────────

    it('renders Today, prev, and next buttons in toolbar', () => {
        renderCalendar([]);
        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    });

    it('calls onNavigate PREV when back chevron is clicked', () => {
        renderCalendar([]);
        const allButtons = screen.getAllByRole('button');
        const prevBtn = allButtons.find(b => b.className.includes('border-r'));
        fireEvent.click(prevBtn);
        expect(screen.getAllByTestId('big-calendar')[0]).toBeInTheDocument();
    });

    it('calls onNavigate TODAY when Today button is clicked', () => {
        renderCalendar([]);
        fireEvent.click(screen.getByRole('button', { name: 'Today' }));
        expect(screen.getByTestId('big-calendar')).toBeInTheDocument();
    });

    it('calls onNavigate NEXT when next chevron is clicked', () => {
        renderCalendar([]);
        const allButtons = screen.getAllByRole('button');
        const nextBtn = allButtons.find(b => b.className.includes('border-l'));
        fireEvent.click(nextBtn);
        expect(screen.getByTestId('big-calendar')).toBeInTheDocument();
    });

    it('renders month/week/day view buttons in toolbar', () => {
        renderCalendar([]);
        expect(screen.getByRole('button', { name: 'month' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'week' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'day' })).toBeInTheDocument();
    });

    it('calls onView when a view button is clicked', () => {
        renderCalendar([]);
        fireEvent.click(screen.getByRole('button', { name: 'week' }));
        expect(screen.getByTestId('big-calendar')).toBeInTheDocument();
    });

    it('highlights the active view button (month by default)', () => {
        renderCalendar([]);
        expect(screen.getByRole('button', { name: 'month' }).className).toContain('bg-white');
        expect(screen.getByRole('button', { name: 'week' }).className).not.toContain('bg-white');
    });

    it('displays the formatted month/year label in toolbar', () => {
        renderCalendar([]);
        const calendar = screen.getByTestId('big-calendar');
        expect(calendar).toBeInTheDocument();
        // Label span should exist with month/year text
        const spans = calendar.querySelectorAll('span.text-lg');
        expect(spans.length).toBeGreaterThan(0);
    });

    it('updates view state when week view is selected', () => {
        renderCalendar([]);
        fireEvent.click(screen.getByRole('button', { name: 'week' }));
        // After clicking week, week button should now be highlighted
        expect(screen.getByRole('button', { name: 'week' }).className).toContain('bg-white');
        expect(screen.getByRole('button', { name: 'month' }).className).not.toContain('bg-white');
    });

    it('updates date state when prev is clicked', () => {
        renderCalendar([]);
        const allButtons = screen.getAllByRole('button');
        const prevBtn = allButtons.find(b => b.className.includes('border-r'));
        fireEvent.click(prevBtn);
        expect(screen.getByTestId('big-calendar')).toBeInTheDocument();
    });
});