import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Team from '../pages/Team';
import * as authContext from '../context/AuthContext';
import * as userApi from '../api/users';
import * as deptApi from '../api/departments';

// Spies and Mocks
const mockNavigate = vi.fn();
vi.mock('../api/users');
vi.mock('../api/departments');

vi.mock('../components/Breadcrumb', () => ({
    default: ({ items }) => <div data-testid="breadcrumb">{items.map(i => i.label).join(' > ')}</div>
}));

vi.mock('../components/RoleGuard', () => ({
    default: ({ children, allowedRoles }) => {
        const { user } = authContext.useAuth();
        if (allowedRoles.includes(user.role)) {
            return <>{children}</>;
        }
        return null;
    }
}));

vi.mock('../components/CustomSelect', () => ({
    default: ({ label, name, value, options, onChange }) => (
        <div data-testid={`custom-select-${name}`}>
            <label>{label}</label>
            <select
                name={name}
                value={value}
                onChange={onChange}
                data-testid={`select-input-${name}`}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}));

vi.mock('lucide-react', () => ({
    Plus: () => <span data-testid="plus-icon" />,
    User: () => <span data-testid="user-icon" />,
    Shield: () => <span data-testid="shield-icon" />,
    Briefcase: () => <span data-testid="briefcase-icon" />,
    Mail: () => <span data-testid="mail-icon" />,
    Pencil: () => <span data-testid="pencil-icon" />,
    Building: () => <span data-testid="building-icon" />,
    Trash2: () => <span data-testid="trash-icon" />,
    MoreVertical: () => <span data-testid="more-vertical-icon" />,
    Send: () => <span data-testid="send-icon" />,
    Search: () => <span data-testid="search-icon" />,
    Filter: () => <span data-testid="filter-icon" />,
}));

const mockUsers = [
    {
        id: 1,
        full_name: 'Admin User',
        email: 'admin@example.com',
        role: 'owner',
        is_active: true,
        department_id: 1,
        managed_departments: [{ id: 1, name: 'Engineering' }]
    },
    {
        id: 2,
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'interviewer',
        is_active: true,
        department_id: 2,
        managed_departments: []
    }
];

const mockDepts = [
    { id: 1, name: 'Engineering' },
    { id: 2, name: 'Product' }
];

describe('Team Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        userApi.getUsers.mockResolvedValue(mockUsers);
        deptApi.getDepartments.mockResolvedValue(mockDepts);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: mockUsers[0] // Admin by default
        });

        // Mock window.confirm
        window.confirm = vi.fn(() => true);
        // Mock window.alert
        window.alert = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderTeam = () =>
        render(
            <MemoryRouter>
                <Team />
            </MemoryRouter>
        );

    it('renders team members and departments correctly', async () => {
        renderTeam();

        expect(screen.getByText(/Loading team.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('Engineering')).toBeInTheDocument();
            expect(screen.getByText('Product')).toBeInTheDocument();
        });

        expect(screen.getByText('Results:')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('filters team members by search query', async () => {
        renderTeam();

        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Search team members.../i);
        fireEvent.change(searchInput, { target: { value: 'Jane' } });

        expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('opens and closes the Direct Add modal', async () => {
        renderTeam();

        await waitFor(() => {
            expect(screen.getByText('Direct Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Direct Add'));
        expect(screen.getByText('Direct Add Member')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(screen.queryByText('Direct Add Member')).not.toBeInTheDocument();
    });

    it('handles direct user creation success', async () => {
        userApi.createUser.mockResolvedValue({ id: 3, full_name: 'New User' });
        renderTeam();

        await waitFor(() => screen.getByText('Direct Add'));
        fireEvent.click(screen.getByText('Direct Add'));

        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'new@example.com' } });

        const roleSelect = screen.getByTestId('select-input-role');
        fireEvent.change(roleSelect, { target: { value: 'hr' } });

        fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

        await waitFor(() => {
            expect(userApi.createUser).toHaveBeenCalledWith(expect.objectContaining({
                full_name: 'New User',
                email: 'new@example.com',
                role: 'hr'
            }));
            expect(userApi.getUsers).toHaveBeenCalledTimes(2); // Initial + Refresh
        });
    });

    it('handles direct user creation with empty department', async () => {
        userApi.createUser.mockResolvedValue({ id: 3 });
        renderTeam();

        await waitFor(() => screen.getByText('Direct Add'));
        fireEvent.click(screen.getByText('Direct Add'));

        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'No Dept User' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'nodp@example.com' } });

        // Select 'No Department' which has value ''
        fireEvent.change(screen.getByTestId('select-input-department_id'), { target: { value: '' } });

        fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

        await waitFor(() => {
            expect(userApi.createUser).toHaveBeenCalledWith(expect.objectContaining({
                department_id: null
            }));
        });
    });

    it('handles direct user creation error with generic message', async () => {
        userApi.createUser.mockRejectedValue(new Error('Generic failure'));
        renderTeam();

        await waitFor(() => screen.getByText('Direct Add'));
        fireEvent.click(screen.getByText('Direct Add'));

        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'new@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

        await waitFor(() => {
            expect(screen.getByText('Operation failed')).toBeInTheDocument();
        });
    });

    it('handles fetchData error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        userApi.getUsers.mockRejectedValue(new Error('Fetch failed'));
        renderTeam();

        await waitFor(() => {
            expect(screen.queryByText(/Loading team.../i)).not.toBeInTheDocument();
        });
        expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch data", expect.any(Error));
    });

    it('handles delete error with alert', async () => {
        userApi.deleteUser.mockRejectedValue({ response: { data: { detail: 'Cannot delete' } } });
        renderTeam();

        await waitFor(() => screen.getByText('Admin User'));

        const actionButtons = screen.getAllByLabelText('User Actions');
        fireEvent.click(actionButtons[1]);

        fireEvent.click(screen.getByText(/Delete/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Cannot delete');
        });
    });

    it('handles delete error with generic message', async () => {
        userApi.deleteUser.mockRejectedValue({});
        renderTeam();

        await waitFor(() => screen.getByText('Admin User'));

        const actionButtons = screen.getAllByLabelText('User Actions');
        fireEvent.click(actionButtons[1]);

        fireEvent.click(screen.getByText(/Delete/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to delete user');
        });
    });

    it('opens and closes the Invite User modal', async () => {
        renderTeam();

        await waitFor(() => {
            expect(screen.getByText('Invite User')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Invite User'));
        expect(screen.getByText('Invite New User')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(screen.queryByText('Invite New User')).not.toBeInTheDocument();
    });

    it('handles user invitation success and auto-close', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        userApi.inviteUser.mockResolvedValue({});
        renderTeam();

        await waitFor(() => screen.getByText('Invite User'));
        fireEvent.click(screen.getByText('Invite User'));

        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invite@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Send Invite/i }));

        await waitFor(() => {
            expect(userApi.inviteUser).toHaveBeenCalled();
            expect(screen.getByText(/Invitation successfully sent to invite@example.com/i)).toBeInTheDocument();
        });

        // Advance timers to check auto-close
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(screen.queryByText('Invite New User')).not.toBeInTheDocument();
        });
    });

    it('handles user invitation error with generic message', async () => {
        userApi.inviteUser.mockRejectedValue({});
        renderTeam();

        await waitFor(() => screen.getByText('Invite User'));
        fireEvent.click(screen.getByText('Invite User'));

        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'fail@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Send Invite/i }));

        await waitFor(() => {
            expect(screen.getByText('Failed to send invitation')).toBeInTheDocument();
        });
    });

    it('closes modals on backdrop click', async () => {
        renderTeam();

        // Direct Add backdrop click
        await waitFor(() => screen.getByText('Direct Add'));
        fireEvent.click(screen.getByText('Direct Add'));
        expect(screen.getByText('Direct Add Member')).toBeInTheDocument();

        // Find the backdrop (it's the div with onClick={() => setIsModalOpen(false)})
        // It has class "fixed inset-0 bg-gray-500 opacity-75"
        const modalBackdrop = document.querySelector('.bg-gray-500.opacity-75');
        fireEvent.click(modalBackdrop);
        expect(screen.queryByText('Direct Add Member')).not.toBeInTheDocument();

        // Invite User backdrop click
        fireEvent.click(screen.getByText('Invite User'));
        expect(screen.getByText('Invite New User')).toBeInTheDocument();
        const inviteBackdrop = document.querySelector('.bg-gray-500.opacity-75');
        fireEvent.click(inviteBackdrop);
        expect(screen.queryByText('Invite New User')).not.toBeInTheDocument();
    });

    it('filters team members by role search', async () => {
        renderTeam();

        await waitFor(() => screen.getByText('Admin User'));

        const searchInput = screen.getByPlaceholderText(/Search team members.../i);
        fireEvent.change(searchInput, { target: { value: 'interviewer' } });

        expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('stays open when clicking inside user actions menu', async () => {
        renderTeam();

        await waitFor(() => screen.getByText('Admin User'));

        const actionButtons = screen.getAllByLabelText('User Actions');
        fireEvent.click(actionButtons[0]);
        const editButton = screen.getByText(/Edit/i);

        fireEvent.mouseDown(editButton);

        expect(screen.getByText(/Edit/i)).toBeInTheDocument();
    });

    it('closes user actions menu when clicking outside', async () => {
        renderTeam();

        await waitFor(() => screen.getByText('Admin User'));

        const actionButtons = screen.getAllByLabelText('User Actions');
        fireEvent.click(actionButtons[0]);
        expect(screen.getByText(/Edit/i)).toBeInTheDocument();

        // Click on the body to trigger handleClickOutside
        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
        });
    });

    it('renders dash if department is not found', async () => {
        userApi.getUsers.mockResolvedValue([{
            id: 3,
            full_name: 'No Dept User',
            email: 'nodp@example.com',
            role: 'hr',
            is_active: true,
            department_id: 999 // Non-existent
        }]);
        renderTeam();

        await waitFor(() => {
            expect(screen.getByText('No Dept User')).toBeInTheDocument();
        });

        // The getDepartmentName(999) should return '-'
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders dash for user with no department and no managed depts', async () => {
        userApi.getUsers.mockResolvedValueOnce([{
            id: 4,
            full_name: 'Independent User',
            email: 'indie@example.com',
            role: 'hr',
            is_active: true,
            department_id: null,
            managed_departments: []
        }]);
        renderTeam();

        await waitFor(() => {
            expect(screen.getByText('Independent User')).toBeInTheDocument();
        });

        // Should show '-' for Department column
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles search with missing user data branches', async () => {
        userApi.getUsers.mockResolvedValueOnce([{
            id: 5,
            full_name: '',
            email: '',
            role: '',
            is_active: true
        }]);
        renderTeam();

        await waitFor(() => screen.getByText('Results:'));

        const searchInput = screen.getByPlaceholderText(/Search team members.../i);
        fireEvent.change(searchInput, { target: { value: 'anything' } });

        // Should not crash and should show 0 results
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles fetchUsers error during refresh', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        userApi.createUser.mockResolvedValue({ id: 3 });
        userApi.getUsers
            .mockResolvedValueOnce(mockUsers) // Initial load
            .mockRejectedValueOnce(new Error('Refresh failed')); // Refresh load

        renderTeam();
        await waitFor(() => screen.getByText('Direct Add'));

        fireEvent.click(screen.getByText('Direct Add'));
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'new@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

        await waitFor(() => {
            expect(userApi.createUser).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch users", expect.any(Error));
        });
    });

    it('handles editing user without phone or location', async () => {
        userApi.getUsers.mockResolvedValueOnce([{
            id: 6,
            full_name: 'Sparse User',
            email: 'sparse@example.com',
            role: 'interviewer',
            is_active: false,
            phone: null,
            location: null,
            department_id: null
        }]);
        renderTeam();

        await waitFor(() => screen.getByText('Sparse User'));
        fireEvent.click(screen.getAllByLabelText('User Actions')[0]);
        fireEvent.click(screen.getByText(/Edit/i));

        expect(screen.getByText('Edit Member')).toBeInTheDocument();
        expect(screen.getByLabelText(/Phone/i).value).toBe('');
        expect(screen.getByLabelText(/Location/i).value).toBe('');
    });

    it('handles user deletion', async () => {
        userApi.deleteUser.mockResolvedValue({});
        renderTeam();

        await waitFor(() => screen.getByText('Admin User'));

        // Open actions menu for Jane Smith (2nd user)
        const actionButtons = screen.getAllByLabelText('User Actions');
        fireEvent.click(actionButtons[1]);

        const deleteButton = screen.getByText(/Delete/i);
        fireEvent.click(deleteButton);

        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => {
            expect(userApi.deleteUser).toHaveBeenCalledWith(2);
            expect(userApi.getUsers).toHaveBeenCalledTimes(2);
        });
    });

    it('handles member editing', async () => {
        userApi.updateUser.mockResolvedValue({});
        renderTeam();

        await waitFor(() => screen.getByText('Jane Smith'));

        const actionButtons = screen.getAllByLabelText('User Actions');
        fireEvent.click(actionButtons[1]);

        fireEvent.click(screen.getByText(/Edit/i));

        expect(screen.getByText('Edit Member')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();

        fireEvent.change(screen.getByDisplayValue('Jane Smith'), { target: { value: 'Jane Updated' } });
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(userApi.updateUser).toHaveBeenCalledWith(2, expect.objectContaining({
                full_name: 'Jane Updated'
            }));
        });
    });

    it('handles member editing with department change', async () => {
        userApi.updateUser.mockResolvedValue({});
        renderTeam();

        await waitFor(() => screen.getByText('Jane Smith'));

        fireEvent.click(screen.getAllByLabelText('User Actions')[1]);
        fireEvent.click(screen.getByText(/Edit/i));

        // Change department to empty
        fireEvent.change(screen.getByTestId('select-input-department_id'), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(userApi.updateUser).toHaveBeenCalledWith(2, expect.objectContaining({
                department_id: null
            }));
        });
    });
});
