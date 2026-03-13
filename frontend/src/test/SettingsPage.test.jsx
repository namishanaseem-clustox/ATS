import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from '../pages/Settings/SettingsPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('SettingsPage Component', () => {
    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <SettingsPage />
            </BrowserRouter>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the Settings header and description', () => {
        renderComponent();

        expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByText('Manage your personal preferences and account details.')).toBeInTheDocument();
    });

    it('renders all settings cards with correct titles and descriptions', () => {
        renderComponent();

        expect(screen.getByText('My Profile')).toBeInTheDocument();
        expect(screen.getByText('Update your name, email address, and password.')).toBeInTheDocument();

        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Choose which events trigger email or in-app alerts.')).toBeInTheDocument();

        expect(screen.getByText('Appearance')).toBeInTheDocument();
        expect(screen.getByText('Set your timezone, date format, and language.')).toBeInTheDocument();
    });

    it('navigates to the correct path when a card is clicked', () => {
        renderComponent();

        const profileCard = screen.getByText('My Profile').closest('button');
        fireEvent.click(profileCard);
        expect(mockNavigate).toHaveBeenCalledWith('/settings/profile');

        const notificationsCard = screen.getByText('Notifications').closest('button');
        fireEvent.click(notificationsCard);
        expect(mockNavigate).toHaveBeenCalledWith('/settings/notifications');

        const appearanceCard = screen.getByText('Appearance').closest('button');
        fireEvent.click(appearanceCard);
        expect(mockNavigate).toHaveBeenCalledWith('/settings/appearance');
    });
});
