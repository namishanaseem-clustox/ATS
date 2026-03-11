import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppearanceSettings from '../pages/Settings/AppearanceSettings';
import * as prefApi from '../api/preferences';

// Mocking dependencies
vi.mock('../api/preferences');
vi.mock('../components/Breadcrumb', () => ({
    default: () => <div data-testid="breadcrumb">Breadcrumb</div>
}));

// Mocking CustomSelect to avoid portal complexity and keep it simple
vi.mock('../components/CustomSelect', () => ({
    default: ({ label, name, value, onChange, options }) => (
        <div data-testid={`select-${name}`}>
            <label>{label}</label>
            <select
                name={name}
                value={value}
                onChange={(e) => onChange(e)}
                data-testid={`input-${name}`}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}));

const mockPrefs = {
    timezone: 'Asia/Karachi',
    date_format: 'DD/MM/YYYY',
    language: 'en'
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AppearanceSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prefApi.getMyPreferences.mockResolvedValue(mockPrefs);
    });

    const renderAppearanceSettings = () => {
        return render(
            <MemoryRouter>
                <AppearanceSettings />
            </MemoryRouter>
        );
    };

    it('renders loading state initially', () => {
        // Return a promise that doesn't resolve immediately
        prefApi.getMyPreferences.mockReturnValue(new Promise(() => { }));
        renderAppearanceSettings();
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders preferences correctly after loading', async () => {
        renderAppearanceSettings();

        await waitFor(() => {
            expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Appearance')).toBeInTheDocument();
        expect(screen.getByTestId('input-timezone')).toHaveValue('Asia/Karachi');
        expect(screen.getByTestId('input-date_format')).toHaveValue('DD/MM/YYYY');
        expect(screen.getByTestId('input-language')).toHaveValue('en');
    });

    it('handles preference changes', async () => {
        renderAppearanceSettings();

        await waitFor(() => screen.getByTestId('input-timezone'));

        const timezoneSelect = screen.getByTestId('input-timezone');
        fireEvent.change(timezoneSelect, { target: { name: 'timezone', value: 'America/New_York' } });

        expect(timezoneSelect).toHaveValue('America/New_York');
    });

    it('saves preferences successfully', async () => {
        prefApi.updateMyPreferences.mockResolvedValue({ ...mockPrefs, timezone: 'America/New_York' });
        renderAppearanceSettings();

        await waitFor(() => screen.getByTestId('input-timezone'));

        const timezoneSelect = screen.getByTestId('input-timezone');
        fireEvent.change(timezoneSelect, { target: { name: 'timezone', value: 'America/New_York' } });

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(prefApi.updateMyPreferences).toHaveBeenCalledWith({
                ...mockPrefs,
                timezone: 'America/New_York'
            });
            expect(screen.getByText('Saved!')).toBeInTheDocument();
        });
    });

    it('navigates back to settings overview when clicking back button', async () => {
        renderAppearanceSettings();

        await waitFor(() => screen.getByRole('button', { name: '' })); // The ArrowLeft button doesn't have a label but we can find it by its parent or icon if we mock lucide-react, but here it's simple

        const backButton = screen.getByRole('button', { name: '' }); // ArrowLeft is inside a button
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
});
