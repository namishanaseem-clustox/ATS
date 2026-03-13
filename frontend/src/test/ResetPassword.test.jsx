import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPassword from '../pages/ResetPassword';
import client from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
    default: {
        post: vi.fn(),
    },
}));

const renderWithRouter = (token = 'test-token') => {
    return render(
        <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
            <Routes>
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('ResetPassword Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the reset password form when token is present', () => {
        renderWithRouter();
        expect(screen.getByText(/Set a new password/i)).toBeInTheDocument();
        // Uses strict regex to avoid "Confirm New Password"
        expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    });

    it('renders error message when token is missing', () => {
        // Pass empty string so searchParams.get('token') is null/empty
        renderWithRouter('');
        expect(screen.getByText(/Invalid reset link/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Request reset link/i })).toBeInTheDocument();
    });

    it('shows error if passwords do not match', async () => {
        renderWithRouter();

        fireEvent.change(screen.getByLabelText(/^New Password$/i), {
            target: { value: 'password123' }
        });
        fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
            target: { value: 'different123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    it('shows error if password is too short', async () => {
        renderWithRouter();

        fireEvent.change(screen.getByLabelText(/^New Password$/i), {
            target: { value: '123' }
        });
        fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
            target: { value: '123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

        expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });

    it('successfully updates password and redirects', async () => {
        client.post.mockResolvedValueOnce({ data: { message: 'Success' } });
        renderWithRouter();

        fireEvent.change(screen.getByLabelText(/^New Password$/i), {
            target: { value: 'newPassword123' }
        });
        fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
            target: { value: 'newPassword123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

        await waitFor(() => {
            expect(screen.getByText(/Password updated!/i)).toBeInTheDocument();
        });

        expect(client.post).toHaveBeenCalledWith('/reset-password', {
            token: 'test-token',
            new_password: 'newPassword123'
        });

        // Wait for the 3-second redirect using real timers
        await waitFor(() => {
            expect(screen.getByText('Login Page')).toBeInTheDocument();
        }, { timeout: 4000 });
    });

    it('handles API errors', async () => {
        client.post.mockRejectedValueOnce({
            response: { data: { detail: 'Token expired' } }
        });
        renderWithRouter();

        fireEvent.change(screen.getByLabelText(/^New Password$/i), {
            target: { value: 'newPassword123' }
        });
        fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
            target: { value: 'newPassword123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

        await waitFor(() => {
            expect(screen.getByText(/Token expired/i)).toBeInTheDocument();
        });
    });

    it('shows loading state during submission', async () => {
        // Use a promise that doesn't resolve immediately to check loading state
        client.post.mockReturnValue(new Promise(() => { }));
        renderWithRouter();

        fireEvent.change(screen.getByLabelText(/^New Password$/i), {
            target: { value: 'newPassword123' }
        });
        fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
            target: { value: 'newPassword123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

        expect(screen.getByText(/Updating…/i)).toBeInTheDocument();

        // Change this line to target the specific button by its name
        expect(screen.getByRole('button', { name: /Updating…/i })).toBeDisabled();
    });

    it('toggles password visibility', () => {
        renderWithRouter();
        const passwordInput = screen.getByLabelText(/^New Password$/i);

        expect(passwordInput).toHaveAttribute('type', 'password');

        // Find button by looking for the Eye icon container
        const toggleBtn = screen.getByRole('button', { name: '' }); // The icon button doesn't have text
        fireEvent.click(toggleBtn);

        expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('renders success state after successful API call', async () => {
        client.post.mockResolvedValueOnce({ data: { message: 'Success' } });
        renderWithRouter();

        // Fill out form
        fireEvent.change(screen.getByLabelText(/^New Password$/i), {
            target: { value: 'newPassword123' }
        });
        fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
            target: { value: 'newPassword123' }
        });

        // Trigger submission
        fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

        // Assert that the success message appears, confirming the JSX inside 
        // the success conditional block was rendered
        await waitFor(() => {
            expect(screen.getByText(/Password updated!/i)).toBeInTheDocument();
        });
    });

});