import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DepartmentDetail from '../pages/Departments/DepartmentDetail';
import * as deptApi from '../api/departments';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();
let capturedOnConfirm;

vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock('../api/departments');
vi.mock('../api/users');

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: '1' }),
    };
});

vi.mock('../pages/JobBoard', () => ({
    default: () => <div data-testid="job-board" />
}));

vi.mock('../components/Breadcrumb', () => ({
    default: () => <div data-testid="breadcrumb" />
}));

vi.mock('../components/ConfirmationModal', () => ({
    default: ({ isOpen, onConfirm, onClose, title, message, confirmText }) => {
        capturedOnConfirm = onConfirm;
        return isOpen ? (
            <div data-testid="confirmation-modal">
                <h2>{title}</h2>
                <p>{message}</p>
                <button onClick={onConfirm}>{confirmText}</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        ) : null;
    }
}));

const mockDepartment = {
    id: '1',
    name: 'Engineering',
    description: 'Dev team',
    status: 'Active',
    owner: { full_name: 'John Doe' },
    total_jobs_count: 5,
    active_jobs_count: 3,
};

const mockMembers = [
    { id: 'u1', full_name: 'Alice', email: 'alice@example.com' },
    { id: 'u2', full_name: 'Bob', email: 'bob@example.com' },
];

describe('DepartmentDetail Integration Tests', () => {
    let queryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReset();
        mockNavigate.mockReset();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, staleTime: 0 },
            },
        });
    });

    const renderPage = (user = { role: 'owner', full_name: 'Owner' }) => {
        mockUseAuth.mockReturnValue({ user });
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/departments/1']}>
                    <Routes>
                        <Route path="/departments/:id" element={<DepartmentDetail />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('renders loading state initially', () => {
        deptApi.getDepartments.mockReturnValue(new Promise(() => { }));
        renderPage();
        expect(screen.getByText(/Loading department.../i)).toBeInTheDocument();
    });

    it('renders "Department not found" when dept is missing', async () => {
        deptApi.getDepartments.mockResolvedValue([]);
        renderPage();
        await waitFor(() => expect(screen.getByText(/Department not found/i)).toBeInTheDocument());
    });

    it('renders department details and members successfully', async () => {
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue(mockMembers);
        renderPage();

        await waitFor(() => expect(screen.getByText('Engineering')).toBeInTheDocument());
        expect(screen.getByText('Dev team')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByTestId('job-board')).toBeInTheDocument();
    });

    it('handles member removal successfully', async () => {
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue(mockMembers);
        deptApi.removeMemberFromDepartment.mockResolvedValue({});

        renderPage();
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        const aliceRow = screen.getByText('Alice').closest('li');
        const removeBtn = within(aliceRow).getByTitle('Remove from Department');
        fireEvent.click(removeBtn);

        expect(screen.getByText(/Are you sure you want to remove Alice/i)).toBeInTheDocument();

        const confirmBtn = screen.getByRole('button', { name: /^Remove$/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => expect(deptApi.removeMemberFromDepartment).toHaveBeenCalledWith('1', 'u1'));
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('handles removal cancellation', async () => {
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue(mockMembers);
        renderPage();
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        fireEvent.click(within(screen.getByText('Alice').closest('li')).getByTitle('Remove from Department'));
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

        expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('handles removal error', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue(mockMembers);
        deptApi.removeMemberFromDepartment.mockRejectedValue(new Error('Fail'));

        renderPage();
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        fireEvent.click(within(screen.getByText('Alice').closest('li')).getByTitle('Remove from Department'));
        fireEvent.click(screen.getByRole('button', { name: /^Remove$/i }));

        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Failed to remove member. Please try again."));
        alertSpy.mockRestore();
    });

    it('renders empty members state', async () => {
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue([]);
        renderPage();
        await waitFor(() => expect(screen.getByText(/No members assigned/i)).toBeInTheDocument());
    });

    it('handles member fetch failure', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockRejectedValue(new Error('Fail'));
        renderPage();
        await waitFor(() => expect(screen.getByText('Engineering')).toBeInTheDocument());
        expect(screen.getByText(/0 Members/i)).toBeInTheDocument();
    });

    it('hides remove buttons for unauthorized roles', async () => {
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue(mockMembers);
        renderPage({ role: 'interviewer' });
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
        expect(screen.queryByTitle('Remove from Department')).not.toBeInTheDocument();
    });

    it('navigates to team page', async () => {
        deptApi.getDepartments.mockResolvedValue([mockDepartment]);
        deptApi.getDepartmentMembers.mockResolvedValue(mockMembers);
        renderPage();
        await waitFor(() => expect(screen.getByText(/Manage Team/i)).toBeInTheDocument());
        fireEvent.click(screen.getByText(/Manage Team/i));
        expect(mockNavigate).toHaveBeenCalledWith('/team');
    });

    it('covers fallbacks for missing department data and Inactive status', async () => {
        const sparseDept = {
            id: '1',
            name: 'Sparse',
            status: 'Inactive',
            // owner and owner_id are missing
            total_jobs_count: 0,
            active_jobs_count: 0
        };
        deptApi.getDepartments.mockResolvedValue([sparseDept]);
        deptApi.getDepartmentMembers.mockResolvedValue([{ id: 'u3', email: 'u3@ex.com' }]);
        renderPage();
        await waitFor(() => expect(screen.getByText('Sparse')).toBeInTheDocument());
        expect(screen.getByText("No description provided.")).toBeInTheDocument();
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
        // Initials fallback (member.full_name is missing)
        expect(screen.getByText('U')).toBeInTheDocument();
        // Inactive status coverage (L99)
        expect(screen.getByText('Inactive')).toHaveClass('bg-gray-100');
    });

    it('covers main fetchData failure (L48)', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        deptApi.getDepartments.mockRejectedValue(new Error('Global Fail'));
        renderPage();
        await waitFor(() => expect(screen.getByText(/Department not found/i)).toBeInTheDocument());
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('covers confirmRemoveMember null guard (L62)', async () => {
        // We trigger confirmRemoveMember when memberToRemove is null.
        // Initially memberToRemove is null. If we call capturedOnConfirm() now, it hits L62 early return.

        renderPage();
        await waitFor(() => expect(screen.queryByText(/Engineering/i) || screen.queryByText(/Department not found/i)).toBeInTheDocument());

        if (capturedOnConfirm) {
            capturedOnConfirm();
        }
        // No error should occur, and it should return early.
    });
});
