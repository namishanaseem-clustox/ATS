import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockLogout = vi.fn();

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

function renderSidebar(role = 'owner', collapsed = false) {
    const onToggle = vi.fn();
    useAuth.mockReturnValue({
        user: { role, full_name: 'Test User', display_name: 'Tester' },
        logout: mockLogout,
    });

    return {
        onToggle,
        ...render(
            <BrowserRouter>
                <Sidebar collapsed={collapsed} onToggle={onToggle} />
            </BrowserRouter>
        ),
    };
}

describe('Sidebar', () => {
    it('renders the Home and Activities links for all roles', () => {
        renderSidebar('interviewer');
        expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Activities/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Jobs/i })).toBeInTheDocument();
    });

    it('renders Administration and Settings for owner', () => {
        renderSidebar('owner');
        expect(screen.getByRole('link', { name: /Administration/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });

    it('renders Administration and Settings for hr', () => {
        renderSidebar('hr');
        expect(screen.getByRole('link', { name: /Administration/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });

    it('does not render Administration for interviewer', () => {
        renderSidebar('interviewer');
        expect(screen.queryByRole('link', { name: /Administration/i })).not.toBeInTheDocument();
        // Settings is rendered for everyone
        expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });

    it('does not render Requisitions, Candidates, or Departments for interviewer', () => {
        renderSidebar('interviewer');
        expect(screen.queryByRole('link', { name: /Requisitions/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Candidates/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Departments/i })).not.toBeInTheDocument();
    });

    it('renders Candidates and Departments for hiring_manager', () => {
        // hiring_manager is neither interviewer nor (owner or hr)
        renderSidebar('hiring_manager');
        expect(screen.getByRole('link', { name: /Candidates/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Departments/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Requisitions/i })).toBeInTheDocument();
    });

    it('calls onToggle when the collapse/expand button is clicked', () => {
        const { onToggle } = renderSidebar('owner', false);

        // Expanded state: collapse button has title "Collapse sidebar"
        const collapseBtn = screen.getByTitle('Collapse sidebar');
        fireEvent.click(collapseBtn);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('shows collapsed view correctly', () => {
        renderSidebar('owner', true);

        // Collapsed state: expand button has title "Expand sidebar"
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
        // Labels shouldn't be visible in collapsed mode
        expect(screen.queryByText('Tester')).not.toBeInTheDocument();
    });

    it('calls logout when the logout button is clicked', () => {
        renderSidebar('owner');
        const logoutBtn = screen.getByTitle('Logout');
        fireEvent.click(logoutBtn);
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('displays the user display name and formatted role', () => {
        renderSidebar('hiring_manager');
        expect(screen.getByText('Tester')).toBeInTheDocument();
        expect(screen.getByText('hiring manager')).toBeInTheDocument(); // CSS capitalize applies, but text content is lowercase replaced
    });
});
