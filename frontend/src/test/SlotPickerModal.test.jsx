import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SlotPickerModal from '../components/SlotPickerModal';

// Mirror the component's fmt() function for timezone-safe assertions
function fmt(isoString) {
    const d = new Date(isoString);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

describe('SlotPickerModal Component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSelect: vi.fn(),
        assigneeIds: ['user1', 'user2'],
        initialDate: '2024-01-15',
        initialDurationMinutes: 45
    };

    const mockSlots = [
        { start: '2024-01-15T09:00:00Z', end: '2024-01-15T09:45:00Z', available: true },
        { start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:45:00Z', available: true },
        { start: '2024-01-15T11:00:00Z', end: '2024-01-15T11:45:00Z', available: false },
        { start: '2024-01-15T14:00:00Z', end: '2024-01-15T14:45:00Z', available: true }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Reassign after clearAllMocks to keep it as a spy
        global.fetch = vi.fn();
        localStorage.setItem('token', 'fake-token');
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('returns null when isOpen is false', () => {
        const { container } = render(
            <SlotPickerModal {...defaultProps} isOpen={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders modal with initial state', () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<SlotPickerModal {...defaultProps} />);

        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
        expect(screen.getByText('Pick a duration and day to see slots.')).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<SlotPickerModal {...defaultProps} />);

        const closeButton = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg') && btn.className.includes('rounded-full')
        );
        fireEvent.click(closeButton);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes modal when backdrop is clicked', () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        const { container } = render(<SlotPickerModal {...defaultProps} />);

        const backdrop = container.querySelector('.bg-gray-900\\/50');
        fireEvent.click(backdrop);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('displays duration options and allows selection', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('45m')).toBeInTheDocument();
        });

        const duration30 = screen.getByText('30m');
        fireEvent.click(duration30);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/calendar/available-slots'),
                expect.objectContaining({
                    body: expect.stringContaining('"duration_minutes":30')
                })
            );
        });
    });

    it('allows changing the date', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        const dateInput = screen.getByDisplayValue('2024-01-15');
        fireEvent.change(dateInput, { target: { value: '2024-01-20' } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"date":"2024-01-20"')
                })
            );
        });
    });

    it('fetches slots on mount with correct parameters', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/calendar/available-slots'),
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer fake-token'
                    },
                    body: JSON.stringify({
                        date: '2024-01-15',
                        duration_minutes: 45,
                        user_ids: ['user1', 'user2']
                    })
                })
            );
        });
    });

    it('displays slots after successful fetch', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(fmt(mockSlots[0].start))).toBeInTheDocument(); // 9:00 AM or local equiv
            expect(screen.getByText(fmt(mockSlots[1].start))).toBeInTheDocument(); // 10:00 AM or local equiv
            expect(screen.getByText(fmt(mockSlots[3].start))).toBeInTheDocument(); // 2:00 PM or local equiv
        });
    });

    it('shows loading state while fetching slots', async () => {
        global.fetch.mockImplementation(() => new Promise(() => { })); // Never resolves

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Checking availability/i)).toBeInTheDocument();
        });
    });

    it('shows error state when fetch fails', async () => {
        global.fetch.mockResolvedValue({
            ok: false
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Could not load time slots. Please try again./i)).toBeInTheDocument();
        });
    });

    it('shows error state when fetch throws', async () => {
        global.fetch.mockRejectedValue(new Error('Network error'));

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Could not load time slots. Please try again./i)).toBeInTheDocument();
        });
    });

    it('displays available and busy slot counts', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/3 available/i)).toBeInTheDocument();
            expect(screen.getByText(/1 busy/i)).toBeInTheDocument();
        });
    });

    it('does not show busy count when all slots are available', async () => {
        const allAvailable = mockSlots.map(s => ({ ...s, available: true }));
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => allAvailable
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/4 available/i)).toBeInTheDocument();
            expect(screen.queryByText(/busy/i)).not.toBeInTheDocument();
        });
    });

    it('calls onSelect and closes modal when available slot is clicked', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        const firstSlotTime = fmt(mockSlots[0].start);

        await waitFor(() => {
            expect(screen.getByText(firstSlotTime)).toBeInTheDocument();
        });

        const firstSlot = screen.getByText(firstSlotTime).closest('button');
        fireEvent.click(firstSlot);

        expect(defaultProps.onSelect).toHaveBeenCalledWith({
            start: '2024-01-15T09:00:00Z',
            end: '2024-01-15T09:45:00Z'
        });
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not call onSelect when busy slot is clicked', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            // The busy slot shows a 'busy' label
            expect(screen.getByText('busy')).toBeInTheDocument();
        });

        // The busy slot button is disabled
        const busyButton = screen.getAllByRole('button').find(btn => btn.disabled);
        expect(busyButton).toBeTruthy();

        fireEvent.click(busyButton);

        expect(defaultProps.onSelect).not.toHaveBeenCalled();
        expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('shows empty state when no slots are returned', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText(/No slots fit this duration on this day/i)).toBeInTheDocument();
        });
    });

    it('resets state when modal opens with new initial values', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        const { rerender } = render(
            <SlotPickerModal {...defaultProps} isOpen={false} />
        );

        // Open modal with new values
        rerender(
            <SlotPickerModal
                {...defaultProps}
                isOpen={true}
                initialDate="2024-02-01"
                initialDurationMinutes={60}
            />
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('2024-02-01')).toBeInTheDocument();
        });
    });

    it('handles empty assigneeIds array', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} assigneeIds={[]} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"user_ids":[]')
                })
            );
        });

        await waitFor(() => {
            expect(screen.getByText(/No assignees selected — all slots shown as available/i)).toBeInTheDocument();
        });
    });

    it('does not show assignee warning when assigneeIds is not empty', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} assigneeIds={['user1']} />);

        await waitFor(() => {
            expect(screen.queryByText(/No assignees selected/i)).not.toBeInTheDocument();
        });
    });

    it('uses default date when initialDate is not provided', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        const { initialDate, ...propsWithoutDate } = defaultProps;

        render(<SlotPickerModal {...propsWithoutDate} />);

        await waitFor(() => {
            const today = new Date().toISOString().split('T')[0];
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining(`"date":"${today}"`)
                })
            );
        });
    });

    it('uses default duration when initialDurationMinutes is not provided', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        const { initialDurationMinutes, ...propsWithoutDuration } = defaultProps;

        render(<SlotPickerModal {...propsWithoutDuration} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"duration_minutes":45')
                })
            );
        });
    });

    it('displays all duration options', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('15m')).toBeInTheDocument();
            expect(screen.getByText('30m')).toBeInTheDocument();
            expect(screen.getByText('45m')).toBeInTheDocument();
            expect(screen.getByText('1h')).toBeInTheDocument();
            expect(screen.getByText('90m')).toBeInTheDocument();
        });
    });

    it('highlights selected duration', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            const duration45 = screen.getByText('45m');
            expect(duration45).toHaveClass('bg-[#00C853]');
            expect(duration45).toHaveClass('text-white');
        });
    });

    it('does not fetch slots when modal is closed', () => {
        render(<SlotPickerModal {...defaultProps} isOpen={false} />);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('uses default date when initialDate is null (fetches with today)', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        const { initialDate, ...propsWithoutDate } = defaultProps;

        render(<SlotPickerModal {...propsWithoutDate} initialDate={null} />);

        // Component uses today as default — fetch WILL be called
        await waitFor(() => {
            const today = new Date().toISOString().split('T')[0];
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining(`"date":"${today}"`)
                })
            );
        });
    });

    it('uses default duration when initialDurationMinutes is null (fetches with 45)', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        render(<SlotPickerModal {...defaultProps} initialDurationMinutes={null} />);

        // Component defaults to 45 minutes — fetch WILL be called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"duration_minutes":45')
                })
            );
        });
    });

    it('refetches slots when assigneeIds change', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockSlots
        });

        const { rerender } = render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        rerender(<SlotPickerModal {...defaultProps} assigneeIds={['user3', 'user4']} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"user_ids":["user3","user4"]')
                })
            );
        });
    });

    it('applies correct styling to available slots', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [mockSlots[0]]
        });

        const { container } = render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            const availableSlot = container.querySelector('.border-gray-200.bg-white');
            expect(availableSlot).toBeInTheDocument();
        });
    });

    it('applies correct styling to busy slots', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [mockSlots[2]]
        });

        const { container } = render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            const busySlot = container.querySelector('.border-gray-100.bg-gray-50');
            expect(busySlot).toBeInTheDocument();
            expect(screen.getByText('busy')).toBeInTheDocument();
        });
    });

    it('sets minimum date to today', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<SlotPickerModal {...defaultProps} />);

        await waitFor(() => {
            const dateInput = screen.getByDisplayValue('2024-01-15');
            const minDate = dateInput.getAttribute('min');
            expect(minDate).toBeTruthy();
        });
    });
});
