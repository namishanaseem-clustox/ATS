import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProfileSettings from '../pages/Settings/ProfileSettings';
import * as authContext from '../context/AuthContext';
import * as userApi from '../api/users';
import client from '../api/client';

const mockNavigate = vi.fn();

vi.mock('../api/users');
vi.mock('../api/client', async () => ({
    default: {
        post: vi.fn(),
        defaults: { headers: { common: {} } }
    },
    API_BASE_URL: 'http://localhost:8000'
}));

vi.mock('../components/Breadcrumb', () => ({
    default: () => <div data-testid="breadcrumb">Breadcrumb</div>
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        Check: () => <span data-testid="check-icon" />,
        X: () => <span data-testid="x-icon" />,
        Camera: () => <span data-testid="camera-icon" />,
        Trash2: () => <span data-testid="trash-icon" />,
        Eye: () => <span data-testid="eye-icon" />,
        EyeOff: () => <span data-testid="eye-off-icon" />,
        ChevronRight: () => <span data-testid="chevron-right-icon" />,
    };
});

const mockUser = {
    id: 1,
    full_name: 'John Doe',
    display_name: 'JohnD',
    email: 'john@example.com',
    phone: '1234567890',
    location: 'New York',
    role: 'admin',
    avatar_url: '/media/avatars/1.png'
};

const mockSetUser = vi.fn();
const mockFetchUser = vi.fn();

describe('ProfileSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: mockUser,
            setUser: mockSetUser,
            fetchUser: mockFetchUser,
            avatarCacheBust: 123
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderProfileSettings = (initialEntries = ['/settings/profile']) =>
        render(
            <MemoryRouter initialEntries={initialEntries}>
                <ProfileSettings />
            </MemoryRouter>
        );

    it('renders user profile information correctly and handles initials', () => {
        renderProfileSettings();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('JohnD')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('1234567890')).toBeInTheDocument();
        expect(screen.getByText('New York')).toBeInTheDocument();
        expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);

        // Test initials logic for empty name
        vi.spyOn(authContext, 'useAuth').mockReturnValueOnce({
            user: { ...mockUser, full_name: '', avatar_url: null },
            setUser: mockSetUser,
            fetchUser: mockFetchUser
        });
        renderProfileSettings(['/settings/profile/empty']);
        expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('allows entering edit mode and saving a field update', async () => {
        userApi.updateUser.mockResolvedValue({ ...mockUser, full_name: 'John Updated' });
        renderProfileSettings();

        fireEvent.click(screen.getByText('Full Name').closest('div'));
        fireEvent.change(screen.getByDisplayValue('John Doe'), { target: { value: 'John Updated' } });
        fireEvent.click(screen.getByLabelText('Save'));

        await waitFor(() => {
            expect(userApi.updateUser).toHaveBeenCalledWith(1, { full_name: 'John Updated' });
            expect(mockSetUser).toHaveBeenCalled();
            expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument();
        });
    });

    it('cancels a field update', () => {
        renderProfileSettings();
        fireEvent.click(screen.getByText('Full Name').closest('div'));
        fireEvent.change(screen.getByDisplayValue('John Doe'), { target: { value: 'John Updated' } });
        fireEvent.click(screen.getByLabelText('Cancel'));

        expect(screen.queryByDisplayValue('John Updated')).not.toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles keyboard navigation in edit mode', async () => {
        userApi.updateUser.mockResolvedValue(mockUser);
        renderProfileSettings();

        // Escape cancels
        fireEvent.click(screen.getByText('Full Name').closest('div'));
        fireEvent.keyDown(screen.getByDisplayValue('John Doe'), { key: 'Escape' });
        expect(screen.queryByDisplayValue('John Doe')).not.toBeInTheDocument();

        // Save button submits
        fireEvent.click(screen.getByText('Full Name').closest('div'));
        fireEvent.change(screen.getByDisplayValue('John Doe'), { target: { value: 'John Enter' } });
        fireEvent.click(screen.getByLabelText('Save'));

        await waitFor(() => {
            expect(userApi.updateUser).toHaveBeenCalledWith(1, { full_name: 'John Enter' });
        });
    });

    it('clears messages after timeout', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        userApi.updateUser.mockResolvedValue(mockUser);
        renderProfileSettings();

        fireEvent.click(screen.getByText('Full Name').closest('div'));
        fireEvent.click(screen.getByLabelText('Save'));

        await waitFor(() => {
            expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument();
        });

        act(() => { vi.advanceTimersByTime(3000); });

        await waitFor(() => {
            expect(screen.queryByText('Profile updated successfully.')).not.toBeInTheDocument();
        });
    }, 10_000);

    it('handles field save error', async () => {
        userApi.updateUser.mockRejectedValue({ response: { data: { detail: 'Save failed' } } });
        renderProfileSettings();

        fireEvent.click(screen.getByText('Full Name').closest('div'));
        fireEvent.click(screen.getByLabelText('Save'));

        await waitFor(() => {
            expect(screen.getByText('Save failed')).toBeInTheDocument();
        });
    });

    it('handles password reset email request and error timeout', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        client.post.mockResolvedValue({ data: { message: 'Email sent' } });
        renderProfileSettings();

        fireEvent.click(screen.getByRole('button', { name: /send link/i }));

        await waitFor(() => {
            expect(screen.getByText(/reset link sent to john@example.com/i)).toBeInTheDocument();
        });

        act(() => { vi.advanceTimersByTime(5000); });

        await waitFor(() => {
            expect(screen.queryByText(/reset link sent to/i)).not.toBeInTheDocument();
        });

        // Error case
        client.post.mockRejectedValue({ response: { data: { detail: 'Email failed' } } });
        fireEvent.click(screen.getByRole('button', { name: /send link/i }));

        await waitFor(() => {
            expect(screen.getByText('Email failed')).toBeInTheDocument();
        });

        act(() => { vi.advanceTimersByTime(5000); });

        await waitFor(() => {
            expect(screen.queryByText('Email failed')).not.toBeInTheDocument();
        });
    }, 15_000);

    it('handles in-app password change and toggles visibility for both fields', async () => {
        userApi.updateUser.mockResolvedValue(mockUser);
        renderProfileSettings();

        fireEvent.click(screen.getByText('Change'));

        const currentPasswordInput = document.getElementById('current_password');
        const newPasswordInput = document.getElementById('new_password');
        const confirmPasswordInput = document.getElementById('confirm_password');

        // Toggle current password visibility
        expect(currentPasswordInput).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByLabelText('Toggle Current Password Visibility'));
        expect(currentPasswordInput).toHaveAttribute('type', 'text');

        // Toggle new password visibility
        expect(newPasswordInput).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByLabelText('Toggle New Password Visibility'));
        expect(newPasswordInput).toHaveAttribute('type', 'text');

        fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
        fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(userApi.updateUser).toHaveBeenCalledWith(1, {
                password: 'newpassword123',
                current_password: 'oldpassword'
            });
            expect(screen.getByText('Password updated successfully.')).toBeInTheDocument();
        });
    });

    it('validates password mismatch in in-app change', async () => {
        renderProfileSettings();
        fireEvent.click(screen.getByText('Change'));

        fireEvent.change(document.getElementById('current_password'), { target: { value: 'old' } });
        fireEvent.change(document.getElementById('new_password'), { target: { value: 'pass1' } });
        fireEvent.change(document.getElementById('confirm_password'), { target: { value: 'pass2' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(screen.getByText('New passwords do not match.')).toBeInTheDocument();
        });
    });

    it('handles cancel in password change form', () => {
        renderProfileSettings();
        fireEvent.click(screen.getByText('Change'));
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(document.getElementById('current_password')).not.toBeInTheDocument();
    });

    it('handles password update error', async () => {
        userApi.updateUser.mockRejectedValue({ response: { data: { detail: 'Old password wrong' } } });
        renderProfileSettings();

        fireEvent.click(screen.getByText('Change'));
        fireEvent.change(document.getElementById('current_password'), { target: { value: 'wrong' } });
        fireEvent.change(document.getElementById('new_password'), { target: { value: 'new123' } });
        fireEvent.change(document.getElementById('confirm_password'), { target: { value: 'new123' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(screen.getByText('Old password wrong')).toBeInTheDocument();
        });
    });

    it('handles avatar upload, removal, and button click', async () => {
        userApi.uploadAvatar.mockResolvedValue({ ...mockUser, avatar_url: '/new/avatar.png' });
        renderProfileSettings();

        const uploadButton = screen.getByRole('button', { name: /upload picture/i });
        fireEvent.click(uploadButton);

        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Profile Picture'), { target: { files: [file] } });

        await waitFor(() => {
            expect(userApi.uploadAvatar).toHaveBeenCalledWith(1, file);
            expect(screen.getByText('Profile picture updated successfully.')).toBeInTheDocument();
        });

        userApi.removeAvatar.mockResolvedValue({ ...mockUser, avatar_url: null });
        fireEvent.click(screen.getByRole('button', { name: /remove/i }));
        await waitFor(() => {
            expect(userApi.removeAvatar).toHaveBeenCalledWith(1);
            expect(screen.getByText('Profile picture removed successfully.')).toBeInTheDocument();
        });

        userApi.removeAvatar.mockRejectedValue({ response: { data: { detail: 'Removal failed' } } });
        fireEvent.click(screen.getByRole('button', { name: /remove/i }));
        await waitFor(() => {
            expect(screen.getByText('Removal failed')).toBeInTheDocument();
        });
    });

    it('handles avatar upload error', async () => {
        userApi.uploadAvatar.mockRejectedValue({ response: { data: { detail: 'File too large' } } });
        renderProfileSettings();

        const file = new File(['too big'], 'large.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Profile Picture'), { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('File too large')).toBeInTheDocument();
        });
    });

    it('handles Google Calendar connection redirect and success param', async () => {
        const originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };
        localStorage.setItem('token', 'fake-token');

        renderProfileSettings();
        fireEvent.click(screen.getByRole('button', { name: /connect/i }));
        expect(window.location.href).toContain('/api/calendar/authorize?token=fake-token');

        window.location = originalLocation;

        renderProfileSettings(['/settings/profile?calendar=connected']);
        await waitFor(() => {
            expect(screen.getByText('Google Calendar connected successfully.')).toBeInTheDocument();
            expect(mockFetchUser).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true });
        });
    });

    it('handles Google Calendar connection error param', async () => {
        renderProfileSettings(['/settings/profile?calendar=error']);
        await waitFor(() => {
            expect(screen.getByText('Failed to connect Google Calendar. Please try again.')).toBeInTheDocument();
            expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true });
        });
    });

    it('handles Google Calendar disconnection success', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true });

        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { ...mockUser, google_access_token: 'some-token' },
            setUser: mockSetUser,
            fetchUser: mockFetchUser
        });

        renderProfileSettings();
        fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));

        await waitFor(() => {
            expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ google_access_token: null }));
            expect(screen.getByText('Google Calendar disconnected.')).toBeInTheDocument();
        });
    });

    it('handles Google Calendar disconnection error', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { ...mockUser, google_access_token: 'some-token' },
            setUser: mockSetUser,
            fetchUser: mockFetchUser
        });

        renderProfileSettings();
        fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));

        await waitFor(() => {
            expect(screen.getByText('Failed to disconnect calendar.')).toBeInTheDocument();
        });
    });
});