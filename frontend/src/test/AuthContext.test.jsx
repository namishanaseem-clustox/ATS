import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import client from '../api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        defaults: {
            headers: {
                common: {}
            }
        }
    }
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

const TestComponent = () => {
    const auth = useAuth();
    const [loginError, setLoginError] = React.useState(null);

    const handleLogin = async () => {
        try {
            await auth.login('test@example.com', 'password');
        } catch (error) {
            setLoginError(error.message);
        }
    };

    return (
        <div>
            <div data-testid="user">{auth.user ? auth.user.email : 'No User'}</div>
            <div data-testid="auth-status">{String(auth.isAuthenticated)}</div>
            <div data-testid="session-message">{auth.sessionMessage || 'None'}</div>
            <div data-testid="avatar-bust">{auth.avatarCacheBust || 'None'}</div>
            <div data-testid="login-error">{loginError || 'None'}</div>
            <button onClick={handleLogin}>Login</button>
            <button onClick={auth.logout}>Logout</button>
            <button onClick={() => auth.setUser({ email: 'updated@example.com' })}>Set User</button>
            <button onClick={auth.clearSessionMessage}>Clear Message</button>
            <button onClick={auth.fetchUser}>Fetch User</button>
        </div>
    );
};

const renderWithProvider = () => {
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        </QueryClientProvider>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        queryClient.clear();
        client.defaults.headers.common = {};
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('provides default unauthenticated state when no token exists', async () => {
        renderWithProvider();
        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
            expect(screen.getByTestId('user')).toHaveTextContent('No User');
        });
        expect(client.get).not.toHaveBeenCalled();
    });

    it('fetches user on mount if token exists in localStorage', async () => {
        localStorage.setItem('token', 'fake-token');
        client.get.mockResolvedValueOnce({ data: { email: 'test@example.com' } });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
            expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        });

        expect(client.get).toHaveBeenCalledWith('/users/me');
        expect(client.defaults.headers.common['Authorization']).toBe('Bearer fake-token');
    });

    it('handles successful login', async () => {
        const user = userEvent.setup();
        client.post.mockResolvedValueOnce({ data: { access_token: 'new-token' } });
        client.get.mockResolvedValueOnce({ data: { email: 'new@example.com' } });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
        });

        await user.click(screen.getByText('Login'));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/token', expect.any(URLSearchParams), expect.any(Object));
            expect(localStorage.getItem('token')).toBe('new-token');
            expect(client.defaults.headers.common['Authorization']).toBe('Bearer new-token');
            expect(screen.getByTestId('user')).toHaveTextContent('new@example.com');
            expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
        });
    });

    it('handles failed login gracefully or throws', async () => {
        const user = userEvent.setup();
        const error = new Error('Login failed');
        client.post.mockRejectedValueOnce(error);

        renderWithProvider();
        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
        });

        await act(async () => {
            await user.click(screen.getByText('Login'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('login-error')).toHaveTextContent('Login failed');
        });
        expect(client.post).toHaveBeenCalled();
    });

    it('handles logout correctly', async () => {
        localStorage.setItem('token', 'fake-token');
        client.get.mockResolvedValueOnce({ data: { email: 'test@example.com' } });
        client.defaults.headers.common['Authorization'] = 'Bearer fake-token';

        const user = userEvent.setup();
        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
        });

        await user.click(screen.getByText('Logout'));

        expect(localStorage.getItem('token')).toBeNull();
        expect(client.defaults.headers.common['Authorization']).toBeUndefined();
        expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
    });

    it('handles fetchUser failure (non-401) and triggers logout', async () => {
        localStorage.setItem('token', 'fake-token');
        const error = new Error('Server Error');
        error.response = { status: 500 };
        client.get.mockRejectedValueOnce(error);

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
            expect(localStorage.getItem('token')).toBeNull();
        });
        expect(console.error).toHaveBeenCalled();
    });

    it('handles fetchUser failure (401) gracefully without double logout', async () => {
        localStorage.setItem('token', 'fake-token');
        const error = new Error('Unauthorized');
        error.response = { status: 401 };
        client.get.mockRejectedValueOnce(error);

        // Setup initial auth defaults mimicking the context initialization
        client.defaults.headers.common['Authorization'] = 'Bearer fake-token';

        renderWithProvider();

        await waitFor(() => {
            // It should NOT call console.error or explicit logout() within the catch block for 401s
            expect(console.error).not.toHaveBeenCalled();
            // Note: In real life, the axios interceptor would handle the 401 and fire the event.
            // Here we just verify the internal try/catch behavior doesn't crash or double-log.
        });
    });

    it('listens for session:expired event and logs out', async () => {
        localStorage.setItem('token', 'fake-token');
        client.get.mockResolvedValueOnce({ data: { email: 'test@example.com' } });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
        });

        act(() => {
            window.dispatchEvent(new Event('session:expired'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
            expect(screen.getByTestId('session-message')).toHaveTextContent('Your session has expired');
        });
    });

    it('clears session message', async () => {
        const user = userEvent.setup();
        renderWithProvider();

        // Artificially trigger session expired to set the message
        act(() => {
            window.dispatchEvent(new Event('session:expired'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('session-message')).not.toHaveTextContent('None');
        });

        await user.click(screen.getByText('Clear Message'));

        await waitFor(() => {
            expect(screen.getByTestId('session-message')).toHaveTextContent('None');
        });
    });

    it('sets user and updates avatar cache bust', async () => {
        const user = userEvent.setup();
        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('No User');
        });

        const initialBust = screen.getByTestId('avatar-bust').textContent;

        await user.click(screen.getByText('Set User'));

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('updated@example.com');
            expect(screen.getByTestId('avatar-bust').textContent).not.toBe(initialBust);
        });
    });

    it('allows manually fetching user', async () => {
        const user = userEvent.setup();
        localStorage.setItem('token', 'fake-token');
        // Initial fetch
        client.get.mockResolvedValueOnce({ data: { email: 'initial@example.com' } });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('initial@example.com');
        });

        // Manual fetch
        client.get.mockResolvedValueOnce({ data: { email: 'fetched@example.com' } });
        await user.click(screen.getByText('Fetch User'));

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('fetched@example.com');
            expect(client.get).toHaveBeenCalledTimes(2);
        });
    });
});
