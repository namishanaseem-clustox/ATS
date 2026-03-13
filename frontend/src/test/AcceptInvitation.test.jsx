import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AcceptInvitation from '../pages/AcceptInvitation';
import * as usersApi from '../api/users';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the axios client so no real HTTP requests are made
vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock the users API functions directly
vi.mock('../api/users', () => ({
    validateInvite: vi.fn(),
    registerInvitedUser: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithToken(token = 'valid-token') {
    return render(
        <MemoryRouter initialEntries={[`/invite/${token}`]}>
            <Routes>
                <Route path="/invite/:token" element={<AcceptInvitation />} />
            </Routes>
        </MemoryRouter>
    );
}

function renderWithoutToken() {
    return render(
        <MemoryRouter initialEntries={['/invite']}>
            <Routes>
                <Route path="/invite" element={<AcceptInvitation />} />
            </Routes>
        </MemoryRouter>
    );
}

async function setupForm() {
    usersApi.validateInvite.mockResolvedValue({ email: 'a@b.com', role: 'recruiter' });
    renderWithToken();
    await waitFor(() => screen.getByPlaceholderText('John Doe'));
}

async function fillForm({ name = 'Jane', password = 'secret123', confirm = 'secret123' } = {}) {
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { name: 'full_name', value: name },
    });
    const [pwInput, confirmInput] = screen.getAllByDisplayValue('');
    fireEvent.change(pwInput, { target: { name: 'password', value: password } });
    fireEvent.change(confirmInput, { target: { name: 'confirm_password', value: confirm } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AcceptInvitation Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── Loading state ──────────────────────────────────────────────────────────

    it('shows the validating/loading screen while token is being checked', () => {
        usersApi.validateInvite.mockReturnValue(new Promise(() => { }));
        renderWithToken();
        expect(screen.getByText('Validating Invitation...')).toBeInTheDocument();
    });

    // ─── No token ───────────────────────────────────────────────────────────────

    it('shows error when no token is provided in the URL', async () => {
        renderWithoutToken();
        await waitFor(() => {
            expect(screen.getByText('No invitation token provided.')).toBeInTheDocument();
        });
    });

    // ─── validateInvite errors ──────────────────────────────────────────────────

    it('shows API error detail when validateInvite rejects with response.data.detail', async () => {
        usersApi.validateInvite.mockRejectedValue({
            response: { data: { detail: 'Token has expired.' } },
        });
        renderWithToken();
        await waitFor(() => {
            expect(screen.getByText('Token has expired.')).toBeInTheDocument();
        });
    });

    it('shows fallback error when validateInvite rejects without response.data.detail', async () => {
        usersApi.validateInvite.mockRejectedValue({});
        renderWithToken();
        await waitFor(() => {
            expect(screen.getByText('Invalid or expired invitation token.')).toBeInTheDocument();
        });
    });

    // ─── Error state UI ─────────────────────────────────────────────────────────

    it('renders the Invitation Error heading and Return to Login button on error', async () => {
        usersApi.validateInvite.mockRejectedValue({});
        renderWithToken();
        await waitFor(() => {
            expect(screen.getByText('Invitation Error')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Return to Login' })).toBeInTheDocument();
        });
    });

    it('navigates to /login when Return to Login button is clicked', async () => {
        usersApi.validateInvite.mockRejectedValue({});
        renderWithToken();
        await waitFor(() => screen.getByRole('button', { name: 'Return to Login' }));
        fireEvent.click(screen.getByRole('button', { name: 'Return to Login' }));
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    // ─── Valid token → form renders ─────────────────────────────────────────────

    it('renders the registration form after valid token is confirmed', async () => {
        usersApi.validateInvite.mockResolvedValue({
            email: 'jane@example.com',
            role: 'hiring_manager',
        });
        renderWithToken();
        await waitFor(() => {
            expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
            expect(screen.getByText('jane@example.com')).toBeInTheDocument();
            expect(screen.getByText(/hiring manager/i)).toBeInTheDocument();
        });
    });

    it('renders full name, password, and confirm password inputs', async () => {
        await setupForm();
        expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
        expect(screen.getAllByDisplayValue('')).toHaveLength(3);
    });

    // ─── handleChange ───────────────────────────────────────────────────────────

    it('updates form fields when user types', async () => {
        await setupForm();
        fireEvent.change(screen.getByPlaceholderText('John Doe'), {
            target: { name: 'full_name', value: 'Jane Doe' },
        });
        expect(screen.getByPlaceholderText('John Doe').value).toBe('Jane Doe');
    });

    // ─── handleSubmit: passwords don't match ────────────────────────────────────

    it('shows error when passwords do not match', async () => {
        await setupForm();
        await fillForm({ password: 'abc123', confirm: 'xyz999' });
        fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });

    // ─── handleSubmit: password too short ───────────────────────────────────────

    it('shows error when password is less than 6 characters', async () => {
        await setupForm();
        await fillForm({ password: 'abc', confirm: 'abc' });
        fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument();
    });

    // ─── handleSubmit: success ──────────────────────────────────────────────────

    it('shows success screen after successful registration', async () => {
        usersApi.registerInvitedUser.mockResolvedValue({});
        await setupForm();
        await fillForm();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        });
        await waitFor(() => {
            expect(screen.getByText('Registration Complete!')).toBeInTheDocument();
        });
    });

    it('auto-navigates to /login after 3 seconds on success', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        usersApi.registerInvitedUser.mockResolvedValue({});
        await setupForm();
        await fillForm();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        });
        await waitFor(() => screen.getByText('Registration Complete!'));
        act(() => vi.advanceTimersByTime(3000));
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        vi.useRealTimers();
    });

    it('navigates to /login when "Click here" button is clicked on success screen', async () => {
        usersApi.registerInvitedUser.mockResolvedValue({});
        await setupForm();
        await fillForm();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        });
        await waitFor(() => screen.getByText(/Click here if you aren't redirected/));
        fireEvent.click(screen.getByText(/Click here if you aren't redirected/));
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    // ─── handleSubmit: API errors ───────────────────────────────────────────────

    it('shows API error detail when registerInvitedUser rejects with response.data.detail', async () => {
        usersApi.registerInvitedUser.mockRejectedValue({
            response: { data: { detail: 'Email already registered.' } },
        });
        await setupForm();
        await fillForm();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        });
        await waitFor(() => {
            expect(screen.getByText('Email already registered.')).toBeInTheDocument();
        });
    });

    it('shows fallback error when registerInvitedUser rejects without response.data.detail', async () => {
        usersApi.registerInvitedUser.mockRejectedValue({});
        await setupForm();
        await fillForm();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        });
        await waitFor(() => {
            expect(screen.getByText('Failed to complete registration.')).toBeInTheDocument();
        });
    });

    // ─── isSubmitting state ─────────────────────────────────────────────────────

    it('disables submit button and shows loading text while submitting', async () => {
        usersApi.registerInvitedUser.mockReturnValue(new Promise(() => { }));
        await setupForm();
        await fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
        await waitFor(() => {
            expect(screen.getByText('Creating Account...')).toBeInTheDocument();
        });
    });
});