import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserProfileDropdown from '../components/UserProfileDropdown';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

import { useAuth } from '../context/AuthContext';

function renderDropdown(userOverrides = {}) {
    useAuth.mockReturnValue({
        user: { role: 'interviewer', full_name: 'John Doe', display_name: 'Johnny', ...userOverrides },
        logout: mockLogout,
        avatarCacheBust: '12345',
    });

    return render(
        <BrowserRouter>
            <UserProfileDropdown />
        </BrowserRouter>
    );
}

describe('UserProfileDropdown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('keeps dropdown closed initially', () => {
        renderDropdown();
        expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });

    it('toggles dropdown visibility on button click', () => {
        renderDropdown();
        const triggerBtn = screen.getByTitle('Johnny');

        fireEvent.click(triggerBtn);
        expect(screen.getByText('Sign out')).toBeInTheDocument();

        fireEvent.click(triggerBtn);
        expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });

    it('closes the dropdown when clicking outside', () => {
        renderDropdown();
        fireEvent.click(screen.getByTitle('Johnny'));
        expect(screen.getByText('Sign out')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });

    it('renders initials when no avatar is provided', () => {
        renderDropdown({ avatar_url: null, full_name: 'Alpha Beta', display_name: null });
        const triggerBtn = screen.getByTitle('Alpha Beta');
        // 'AB' inside the button
        expect(triggerBtn).toHaveTextContent('AB');
    });

    it('renders avatar image when avatar_url is provided', () => {
        renderDropdown({ avatar_url: '/media/avatar.png' });
        const img = screen.getByAltText('Avatar');
        expect(img).toBeInTheDocument();
        expect(img.src).toContain('/media/avatar.png?t=12345');
    });

    it('renders Administration link for HR', () => {
        renderDropdown({ role: 'hr' });
        fireEvent.click(screen.getByTitle('Johnny'));
        expect(screen.getByRole('link', { name: /Administration/i })).toBeInTheDocument();
    });

    it('renders Administration link for Owner', () => {
        renderDropdown({ role: 'owner' });
        fireEvent.click(screen.getByTitle('Johnny'));
        expect(screen.getByRole('link', { name: /Administration/i })).toBeInTheDocument();
    });

    it('does not render Administration link for Interviewer', () => {
        renderDropdown({ role: 'interviewer' });
        fireEvent.click(screen.getByTitle('Johnny'));
        expect(screen.queryByRole('link', { name: /Administration/i })).not.toBeInTheDocument();
    });

    it('calls logout, toggles closed, and navigates on Sign out click', () => {
        renderDropdown();
        fireEvent.click(screen.getByTitle('Johnny'));

        const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
        fireEvent.click(signOutBtn);

        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(screen.queryByText('Current User')).not.toBeInTheDocument(); // Menu closed
    });
});
