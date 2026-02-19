import React, { useState, useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, Phone, Users, CheckSquare, FileText } from 'lucide-react';
import ActivityModal from './ActivityModal';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Custom Toolbar Component
const CustomToolbar = (toolbar) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    const label = () => {
        const date = toolbar.date;
        return (
            <span className="text-lg font-bold text-gray-800 capitalize">
                {format(date, 'MMMM yyyy')}
            </span>
        );
    };

    return (
        <div className="flex justify-between items-center mb-6 p-1">
            <div className="flex items-center space-x-4">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                    <button onClick={goToBack} className="p-2 hover:bg-gray-50 text-gray-600 border-r border-gray-100">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={goToCurrent} className="px-4 py-2 text-sm font-medium hover:bg-gray-50 text-gray-700">
                        Today
                    </button>
                    <button onClick={goToNext} className="p-2 hover:bg-gray-50 text-gray-600 border-l border-gray-100">
                        <ChevronRight size={20} />
                    </button>
                </div>
                {label()}
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
                {['month', 'week', 'day'].map(view => (
                    <button
                        key={view}
                        onClick={() => toolbar.onView(view)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${toolbar.view === view
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {view}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Custom Event Component
const CustomEvent = ({ event }) => {
    let Icon = CalendarIcon;

    switch (event.resource.activity_type) {
        case 'Interview': Icon = Video; break;
        case 'Call': Icon = Phone; break;
        case 'Meeting': Icon = Users; break;
        case 'Task': Icon = CheckSquare; break;
        case 'Note': Icon = FileText; break;
    }

    const candidateName = event.resource.candidate
        ? `${event.resource.candidate.first_name} ${event.resource.candidate.last_name}`
        : null;

    return (
        <div className="flex flex-col h-full justify-center px-1">
            <div className="flex items-center space-x-1">
                <Icon size={12} className="text-white opacity-90 flex-shrink-0" />
                <span className="text-xs font-semibold truncate">{event.resource.title}</span>
            </div>
            {candidateName && (
                <div className="text-[10px] opacity-80 truncate ml-4">{candidateName}</div>
            )}
        </div>
    );
};

const CalendarView = ({ activities, onRefresh }) => {
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Map activities to calendar events
    const events = useMemo(() => {
        return activities
            .filter(a => a.scheduled_at)
            .map(activity => ({
                id: activity.id,
                title: activity.title || activity.activity_type,
                start: new Date(activity.scheduled_at),
                end: new Date(new Date(activity.scheduled_at).getTime() + 60 * 60 * 1000), // Default 1 hour
                resource: activity
            }));
    }, [activities]);

    const handleSelectEvent = (event) => {
        setSelectedActivity(event.resource);
        setIsModalOpen(true);
    };

    const handleNavigate = (newDate) => setDate(newDate);
    const handleViewChange = (newView) => setView(newView);

    const handleSaveActivity = (savedActivity) => {
        if (onRefresh) onRefresh();
    };

    // Style override
    const calendarStyles = `
        .rbc-calendar { font-family: inherit; }
        .rbc-header { padding: 12px 0; font-weight: 600; font-size: 0.875rem; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
        .rbc-month-view { border: 1px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden; }
        .rbc-day-bg { border-left: 1px solid #f3f4f6; }
        .rbc-off-range-bg { bg-color: #f9fafb; }
        .rbc-today { background-color: #f0fdf4 !important; }
        .rbc-event { border-radius: 4px; box-shadow: none; border: none; padding: 0 !important; overflow: hidden; }
        .rbc-time-view .rbc-event { width: 100% !important; }
        .rbc-current-time-indicator { background-color: #ef4444; }
        .rbc-event-label { display: none !important; }
        .rbc-event-content { padding: 4px; height: 100%; min-height: 24px; }
    `;

    const eventPropGetter = (event) => {
        let backgroundColor = '#6b7280';
        switch (event.resource.activity_type) {
            case 'Interview': backgroundColor = '#8b5cf6'; break; // Purple
            case 'Call': backgroundColor = '#3b82f6'; break;      // Blue
            case 'Meeting': backgroundColor = '#f97316'; break;   // Orange
            case 'Task': backgroundColor = '#10b981'; break;      // Green
            case 'Note': backgroundColor = '#64748b'; break;      // Slate
        }
        return { style: { backgroundColor } };
    };

    const components = useMemo(() => ({
        toolbar: CustomToolbar,
        event: CustomEvent
    }), []);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-220px)]">
            <style>{calendarStyles}</style>
            <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                components={components}
                eventPropGetter={eventPropGetter}
                views={['month', 'week', 'day']}
                view={view}
                date={date}
                onView={handleViewChange}
                onNavigate={handleNavigate}
            />

            {selectedActivity && (
                <ActivityModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    activity={selectedActivity}
                    jobId={selectedActivity.job_id}
                    candidateId={selectedActivity.candidate_id}
                    onSave={handleSaveActivity}
                />
            )}
        </div>
    );
};

export default CalendarView;
