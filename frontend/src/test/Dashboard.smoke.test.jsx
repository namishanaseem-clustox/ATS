/**
 * Smoke test to isolate what is hanging in Dashboard integration tests.
 * We test each layer independently to find the blocker.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AuthProvider, useAuth } from '../context/AuthContext';

// ─── Local MSW server (isolated from global setup.js server) ─────────────────
const smokeServer = setupServer(
    http.get('http://localhost:8000/users/me', () => {
        return HttpResponse.json({
            id: 'u1',
            full_name: 'Smoke User',
            role: 'owner',
            is_active: true
        });
    })
);

beforeAll(() => smokeServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => smokeServer.resetHandlers());
afterAll(() => smokeServer.close());

// ─── Minimal localStorage mock ────────────────────────────────────────────────
const store = {};
vi.stubGlobal('localStorage', {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

// ─── Helper ──────────────────────────────────────────────────────────────────
const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

// ─── Test 1: Does useAuth resolve when token exists and /users/me is mocked? ──
const WhoAmI = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>loading auth...</div>;
    if (!user) return <div>not authenticated</div>;
    return <div>Hello {user.full_name}</div>;
};

describe('Dashboard smoke tests', () => {

    it('AuthContext resolves user from /users/me when token is in localStorage', async () => {
        localStorage.setItem('token', 'fake-token');

        render(
            <QueryClientProvider client={queryClient()}>
                <MemoryRouter>
                    <AuthProvider>
                        <WhoAmI />
                    </AuthProvider>
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Should show loading first
        expect(screen.getByText('loading auth...')).toBeInTheDocument();

        // Then resolve to Smoke User once MSW returns the user
        await waitFor(() => {
            expect(screen.getByText('Hello Smoke User')).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it('AuthContext shows "not authenticated" when no token is set', async () => {
        // No token in localStorage

        render(
            <QueryClientProvider client={queryClient()}>
                <MemoryRouter>
                    <AuthProvider>
                        <WhoAmI />
                    </AuthProvider>
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.queryByText('loading auth...')).not.toBeInTheDocument();
        }, { timeout: 3000 });

        expect(screen.getByText('not authenticated')).toBeInTheDocument();
    });

});
