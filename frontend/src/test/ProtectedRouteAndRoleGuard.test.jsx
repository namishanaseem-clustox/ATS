import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleGuard from '../components/RoleGuard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mock the AuthContext so we can control what `useAuth()` returns
 * without any network calls or real token logic.
 */
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

/**
 * Wraps a component in a MemoryRouter starting at `initialPath`.
 * We add a catch-all <Route> for /login and /jobs so we can assert
 * that the router actually navigated there.
 */
function renderWithRouter(ui, { initialPath = '/' } = {}) {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/jobs" element={<div>Jobs Page</div>} />
                <Route path="*" element={ui} />
            </Routes>
        </MemoryRouter>
    );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
    it('redirects to /login when there is no authenticated user', () => {
        useAuth.mockReturnValue({ user: null });
        renderWithRouter(
            <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
        );
        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children when the user is authenticated and no role restriction is set', () => {
        useAuth.mockReturnValue({ user: { role: 'hiring_manager' } });
        renderWithRouter(
            <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
        );
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders children when the user role is in allowedRoles', () => {
        useAuth.mockReturnValue({ user: { role: 'owner' } });
        renderWithRouter(
            <ProtectedRoute allowedRoles={['owner', 'hr']}>
                <div>Admin Content</div>
            </ProtectedRoute>
        );
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('redirects to /jobs when the user role is NOT in allowedRoles', () => {
        useAuth.mockReturnValue({ user: { role: 'interviewer' } });
        renderWithRouter(
            <ProtectedRoute allowedRoles={['owner', 'hr']}>
                <div>Admin Content</div>
            </ProtectedRoute>
        );
        expect(screen.getByText('Jobs Page')).toBeInTheDocument();
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('renders children for each allowed role', () => {
        const allowedRoles = ['owner', 'hr'];
        for (const role of allowedRoles) {
            useAuth.mockReturnValue({ user: { role } });
            const { unmount } = renderWithRouter(
                <ProtectedRoute allowedRoles={allowedRoles}>
                    <div>Role Content</div>
                </ProtectedRoute>
            );
            expect(screen.getByText('Role Content')).toBeInTheDocument();
            unmount();
        }
    });
});

// ─── RoleGuard ────────────────────────────────────────────────────────────────

describe('RoleGuard', () => {
    it('renders nothing when there is no authenticated user', () => {
        useAuth.mockReturnValue({ user: null });
        const { container } = render(
            <RoleGuard allowedRoles={['owner']}>
                <div>Owner Button</div>
            </RoleGuard>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the user role is not in allowedRoles', () => {
        useAuth.mockReturnValue({ user: { role: 'interviewer' } });
        const { container } = render(
            <RoleGuard allowedRoles={['owner', 'hr']}>
                <div>Restricted Element</div>
            </RoleGuard>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders children when the user role is in allowedRoles', () => {
        useAuth.mockReturnValue({ user: { role: 'hr' } });
        render(
            <RoleGuard allowedRoles={['owner', 'hr']}>
                <div>HR-Only Button</div>
            </RoleGuard>
        );
        expect(screen.getByText('HR-Only Button')).toBeInTheDocument();
    });

    it('renders multiple children correctly when role is allowed', () => {
        useAuth.mockReturnValue({ user: { role: 'owner' } });
        render(
            <RoleGuard allowedRoles={['owner']}>
                <button>Delete</button>
                <button>Archive</button>
            </RoleGuard>
        );
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('does not render children for a role that is not in the list', () => {
        useAuth.mockReturnValue({ user: { role: 'hiring_manager' } });
        render(
            <RoleGuard allowedRoles={['owner']}>
                <div>Owner Only</div>
            </RoleGuard>
        );
        expect(screen.queryByText('Owner Only')).not.toBeInTheDocument();
    });
});
