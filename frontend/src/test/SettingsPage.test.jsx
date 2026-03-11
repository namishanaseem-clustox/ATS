import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import SettingsPage from '../pages/Settings/SettingsPage';

// Mocking Breadcrumb as it's a sub-component
vi.mock('../components/Breadcrumb', () => ({
    default: ({ items }) => <div data-testid="breadcrumb">{items.map(i => i.label).join(' > ')}</div>
}));

describe('SettingsPage', () => {
    const renderSettingsPage = () => {
        return render(
            <MemoryRouter initialEntries={['/settings']}>
                <Routes>
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/profile" element={<div>Profile Page</div>} />
                    <Route path="/settings/notifications" element={<div>Notifications Page</div>} />
                    <Route path="/settings/appearance" element={<div>Appearance Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('renders the settings header and description', () => {
        renderSettingsPage();
        expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
        expect(screen.getByText('Manage your personal preferences and account details.')).toBeInTheDocument();
    });

    it('renders all settings cards', () => {
        renderSettingsPage();
        expect(screen.getByText('My Profile')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('navigates to Profile page when clicking My Profile card', () => {
        renderSettingsPage();
        fireEvent.click(screen.getByText('My Profile'));
        expect(screen.getByText('Profile Page')).toBeInTheDocument();
    });

    it('navigates to Notifications page when clicking Notifications card', () => {
        renderSettingsPage();
        fireEvent.click(screen.getByText('Notifications'));
        expect(screen.getByText('Notifications Page')).toBeInTheDocument();
    });

    it('navigates to Appearance page when clicking Appearance card', () => {
        renderSettingsPage();
        fireEvent.click(screen.getByText('Appearance'));
        expect(screen.getByText('Appearance Page')).toBeInTheDocument();
    });

    it('renders the Breadcrumb component', () => {
        renderSettingsPage();
        expect(screen.getByTestId('breadcrumb')).toHaveTextContent('Settings');
    });
});
