import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationsSettings from '../pages/Settings/NotificationsSettings';
import * as prefApi from '../api/preferences';

// Mocking dependencies
vi.mock('../api/preferences');
vi.mock('../components/Breadcrumb', () => ({
    default: () => <div data-testid="breadcrumb">Breadcrumb</div>
}));

const mockPrefs = {
    notify_new_candidate: true,
    notify_activity_assigned: false,
    notify_feedback_submitted: true,
    notify_stage_change: false
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('NotificationsSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prefApi.getMyPreferences.mockResolvedValue(mockPrefs);
    });

    const renderNotificationsSettings = () => {
        return render(
            <MemoryRouter>
                <NotificationsSettings />
            </MemoryRouter>
        );
    };

    it('renders loading state initially', () => {
        prefApi.getMyPreferences.mockReturnValue(new Promise(() => { }));
        renderNotificationsSettings();
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders notification options correctly after loading', async () => {
        renderNotificationsSettings();

        await waitFor(() => {
            expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('New Candidate Added')).toBeInTheDocument();
        expect(screen.getByText('Activity Assigned to Me')).toBeInTheDocument();

        // Check toggles (buttons)
        const toggles = screen.getAllByRole('button');
        // Toggle 1 (New Candidate) - true
        // Toggle 2 (Activity Assigned) - false
        // Toggle 3 (Feedback) - true
        // Toggle 4 (Stage Change) - false
        // Plus navigation button

        // Filter out navigation buttons
        const switches = toggles.filter(btn => btn.className.includes('relative inline-flex'));
        expect(switches.length).toBe(4);

        expect(switches[0]).toHaveClass('bg-[#00C853]');
        expect(switches[1]).toHaveClass('bg-gray-200');
    });

    it('handles toggle changes', async () => {
        renderNotificationsSettings();

        await waitFor(() => screen.queryByText('Loading…') === null);

        const switches = screen.getAllByRole('button').filter(btn => btn.className.includes('relative inline-flex'));

        // Toggle "Activity Assigned to Me" from false to true
        fireEvent.click(switches[1]);
        expect(switches[1]).toHaveClass('bg-[#00C853]');
    });

    it('saves notification preferences successfully', async () => {
        prefApi.updateMyPreferences.mockResolvedValue({ ...mockPrefs, notify_activity_assigned: true });
        renderNotificationsSettings();

        await waitFor(() => screen.queryByText('Loading…') === null);

        const switches = screen.getAllByRole('button').filter(btn => btn.className.includes('relative inline-flex'));
        fireEvent.click(switches[1]);

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(prefApi.updateMyPreferences).toHaveBeenCalledWith({
                ...mockPrefs,
                notify_activity_assigned: true
            });
            expect(screen.getByText('Saved!')).toBeInTheDocument();
        });
    });

    it('navigates back to settings overview when clicking back button', async () => {
        renderNotificationsSettings();

        await waitFor(() => screen.queryByText('Loading…') === null);

        // First button is the back button (ArrowLeft)
        const backButton = screen.getAllByRole('button').find(btn => btn.className.includes('text-gray-400'));
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
});
