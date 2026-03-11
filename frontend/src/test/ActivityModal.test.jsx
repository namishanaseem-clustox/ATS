import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActivityModal from '../components/ActivityModal';
import * as authContext from '../context/AuthContext';
import * as candidateApi from '../api/candidates';
import * as jobApi from '../api/jobs';
import * as activityApi from '../api/activities';
import * as userApi from '../api/users';
import * as scorecardApi from '../api/scorecards';

vi.mock('lucide-react', () => ({
    X: () => <div data-testid="icon-x" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    User: () => <div data-testid="icon-user" />,
    Clock: () => <div data-testid="icon-clock" />,
    AlignLeft: () => <div data-testid="icon-align-left" />,
    Users: () => <div data-testid="icon-users" />,
    Briefcase: () => <div data-testid="icon-briefcase" />,
    ClipboardList: () => <div data-testid="icon-clipboard-list" />,
    Check: () => <div data-testid="icon-check" />,
    AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
    CalendarDays: () => <div data-testid="icon-calendar-days" />,
    Pencil: () => <div data-testid="icon-pencil" />
}));

vi.mock('../components/SlotPickerModal', () => ({
    default: ({ isOpen, onSelect, onClose }) => isOpen ? (
        <div data-testid="slot-picker-modal">
            <button onClick={() => onSelect({ start: '2023-10-10T10:00:00Z', end: '2023-10-10T11:00:00Z' })}>Select Slot</button>
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

vi.mock('../components/CustomSelect', () => ({
    default: ({ label, name, value, onChange, options, disabled }) => (
        <div data-testid={`custom-select-${name}`}>
            <label>{label}</label>
            <select
                name={name}
                value={value || ''}
                disabled={disabled}
                onChange={(e) => onChange({ target: { name, value: e.target.value } })}
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    )
}));

vi.mock('../components/MultiSelect', () => ({
    default: ({ name, value, onChange, options, disabled }) => (
        <div data-testid={`multi-select-${name}`}>
            <select
                multiple
                name={name}
                disabled={disabled}
                value={value || []}
                onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions).map(o => o.value);
                    onChange({ target: { name, value: selectedOptions } });
                }}
            >
                {options.map(opt => (
                    <option key={opt.id || opt.value} value={opt.id || opt.value}>
                        {opt.full_name || opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}));

vi.mock('../api/candidates');
vi.mock('../api/jobs');
vi.mock('../api/activities');
vi.mock('../api/users');
vi.mock('../api/scorecards');

describe('ActivityModal Component', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    const mockJobs = [{ id: 'job1', title: 'Software Engineer' }];
    const mockCandidates = [{ candidate: { id: 'cand1', first_name: 'John', last_name: 'Doe' } }];
    const mockUsers = [
        { id: 'user1', full_name: 'Jane HM' },
        { id: 'user2', full_name: 'Interviewer Joe' }
    ];
    const mockTemplates = [{ id: 'tpl1', name: 'Standard Interview' }];

    beforeEach(() => {
        vi.clearAllMocks();
        jobApi.getJobs.mockResolvedValue(mockJobs);
        candidateApi.getJobCandidates.mockResolvedValue(mockCandidates);
        userApi.getUsers.mockResolvedValue(mockUsers);
        scorecardApi.getScorecardTemplates.mockResolvedValue(mockTemplates);

        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'admin' }
        });

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                user1: [],
                user2: [{ start: '2023-10-10T10:00:00Z', end: '2023-10-10T11:00:00Z' }]
            })
        });

        localStorage.setItem('token', 'mock-token');
    });

    // ✅ Unmount after every test so component state never bleeds between tests
    afterEach(() => {
        cleanup();
    });

    const renderModal = (props = {}) => render(
        <ActivityModal
            isOpen={true}
            onClose={mockOnClose}
            onSave={mockOnSave}
            {...props}
        />
    );

    it('renders with initialType Meeting', async () => {
        renderModal({ initialType: 'Meeting' });
        expect(await screen.findByText('Schedule Activity')).toBeInTheDocument();
        const typeSelect = (await screen.findByTestId('custom-select-activity_type')).querySelector('select');
        expect(typeSelect).toHaveValue('Meeting');
    });

    it('submits update successfully with fallback title', async () => {
        const user = userEvent.setup();
        const activity = { id: 'act1', activity_type: 'Call' };
        activityApi.updateActivity.mockResolvedValue({ id: 'act1' });

        renderModal({ activity });
        expect(await screen.findByText('Edit Activity')).toBeInTheDocument();

        await waitFor(() => expect(jobApi.getJobs).toHaveBeenCalled());

        await user.click(screen.getByText('Save Activity'));

        await waitFor(() => {
            expect(activityApi.updateActivity).toHaveBeenCalled();
        });
    });

    it('handles availability check with conflicts', async () => {
        const user = userEvent.setup();
        renderModal();
        await screen.findByText('Schedule Activity');
        await user.click(screen.getByText(/Enter times manually/i));

        fireEvent.change(document.querySelector('input[name="scheduled_at"]'), { target: { value: '2023-10-10T10:00' } });
        fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { value: '2023-10-10T11:00' } });

        const userSelect = (await screen.findByTestId('multi-select-assignee_ids')).querySelector('select');
        await user.selectOptions(userSelect, ['user1', 'user2']);

        await user.click(screen.getByRole('button', { name: /Check Availability/i }));
        expect(await screen.findByText('Scheduling conflict detected')).toBeInTheDocument();
    });

    it('handles availability check validation failure (missing fields)', async () => {
        renderModal();
        await screen.findByText('Schedule Activity');
        await userEvent.click(screen.getByText(/Enter times manually/i));

        const checkBtn = screen.getByRole('button', { name: /Check Availability/i });
        // Force trigger even if disabled to hit the guard branch
        fireEvent.click(checkBtn);

        expect(await screen.findByText(/Please select start time, end time, and at least one interviewer/i)).toBeInTheDocument();
    });

    it('handles update API errors', async () => {
        const user = userEvent.setup();
        const activity = { id: 'act1', title: 'Test' };
        activityApi.updateActivity.mockRejectedValue(new Error('Update failed'));

        renderModal({ activity });
        await screen.findByText('Edit Activity');

        await user.click(screen.getByText('Save Activity'));
        expect(await screen.findByText('Update failed')).toBeInTheDocument();
    });

    it('handles availability check API error', async () => {
        const user = userEvent.setup();
        global.fetch.mockRejectedValue(new Error('API Down'));

        renderModal();
        await screen.findByText('Schedule Activity');
        await user.click(screen.getByText(/Enter times manually/i));

        fireEvent.change(document.querySelector('input[name="scheduled_at"]'), { target: { value: '2023-10-10T10:00' } });
        fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { value: '2023-10-10T11:00' } });
        await user.selectOptions(
            (await screen.findByTestId('multi-select-assignee_ids')).querySelector('select'),
            ['user1']
        );

        await user.click(screen.getByRole('button', { name: /Check Availability/i }));
        expect(await screen.findByText(/Could not check availability/i)).toBeInTheDocument();
    });

    it('handles unconnected results in availability check', async () => {
        const user = userEvent.setup();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ user1: null, user2: [] })
        });

        renderModal();
        await screen.findByText('Schedule Activity');
        await user.click(screen.getByText(/Enter times manually/i));

        fireEvent.change(document.querySelector('input[name="scheduled_at"]'), { target: { value: '2023-10-10T10:00' } });
        fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { value: '2023-10-10T11:00' } });
        await user.selectOptions(
            (await screen.findByTestId('multi-select-assignee_ids')).querySelector('select'),
            ['user1', 'user2']
        );

        await user.click(screen.getByRole('button', { name: /Check Availability/i }));
        expect(await screen.findByText(/Could not verify all participants/i)).toBeInTheDocument();
        expect(screen.getByText('Unlinked')).toBeInTheDocument();
    });

    it('reschedules using slot picker', async () => {
        const user = userEvent.setup();
        renderModal();
        await screen.findByText('Schedule Activity');

        await user.click(screen.getByRole('button', { name: /select a time slot/i }));
        await user.click(screen.getByText('Select Slot'));
        await user.click(screen.getByText('Close'));

        expect(await screen.findByText(/Oct 10/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Reschedule/i }));
        expect(await screen.findByTestId('slot-picker-modal')).toBeInTheDocument();
    });

    it('submits new activity with diverse participant input styles', async () => {
        const user = userEvent.setup();
        activityApi.createActivity.mockResolvedValue({ id: 'new-act' });

        renderModal();
        await screen.findByText('Schedule Activity');
        fireEvent.change(screen.getByPlaceholderText(/e.g. Initial Screening/i), { target: { value: 'Test' } });

        const participantsInput = screen.getByPlaceholderText(/Jane Doe \(Client\), etc./i);
        await user.type(participantsInput, 'Client 1, Client 2');

        await user.click(screen.getByText('Save Activity'));
        await waitFor(() => {
            expect(activityApi.createActivity).toHaveBeenCalledWith(expect.objectContaining({
                participants: ['Client 1', 'Client 2']
            }));
        });
    });

    it('handles submission rejection/error missing message', async () => {
        const user = userEvent.setup();
        activityApi.createActivity.mockRejectedValue({});

        renderModal();
        await screen.findByText('Schedule Activity');
        fireEvent.change(screen.getByPlaceholderText(/e.g. Initial Screening/i), { target: { value: 'Test' } });
        await user.click(screen.getByText('Save Activity'));

        expect(await screen.findByText(/Failed to save activity. Please try again./i)).toBeInTheDocument();
    });

    it('handles effectiveJobId through activity.job_id', async () => {
        const activity = { id: 'act1', job_id: 'job1' };
        renderModal({ activity });
        await waitFor(() => {
            expect(candidateApi.getJobCandidates).toHaveBeenCalledWith('job1');
        });
    });

    it('handles candidates list with null candidate entries', async () => {
        candidateApi.getJobCandidates.mockResolvedValue([
            { candidate: null },
            { candidate: { id: 'c1', first_name: 'A', last_name: 'B' } }
        ]);
        renderModal({ jobId: 'job1' });
        const candidateSelect = (await screen.findByTestId('custom-select-candidate_id')).querySelector('select');
        expect(candidateSelect.options).toHaveLength(2); // "-- None --" + "A B"
    });

    it('clears candidates list when job is deselected', async () => {
        const user = userEvent.setup();
        renderModal();
        const jobSelect = (await screen.findByTestId('custom-select-job_id')).querySelector('select');
        await user.selectOptions(jobSelect, 'job1');
        await user.selectOptions(jobSelect, '');
        await waitFor(() => {
            expect(screen.queryByTestId('custom-select-candidate_id')).not.toBeInTheDocument();
        });
    });

    it('implements role guards for interviewers', async () => {
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'interviewer' } });
        renderModal({ activity: { id: 'a1', title: 'T' } });
        expect(await screen.findByText(/As an interviewer, you can only edit/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Initial Screening/i)).toBeDisabled();
    });

    it('handles console error on mount data fetch failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        jobApi.getJobs.mockRejectedValue(new Error('Fail'));
        renderModal();
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch modal data:', expect.any(Error));
        });
        consoleSpy.mockRestore();
    });
});