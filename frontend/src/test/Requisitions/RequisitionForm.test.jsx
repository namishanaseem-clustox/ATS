import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequisitionForm from '../../pages/Requisitions/RequisitionForm';
import * as authContext from '../../context/AuthContext';
import * as deptApi from '../../api/departments';
import * as reqApi from '../../api/requisitions';

vi.mock('../../api/departments');
vi.mock('../../api/requisitions');

// ─── Mock react-router-dom ────────────────────────────────────────────────────
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => mockUseParams(),
    };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockDepartments = [
    { id: 'dept1', name: 'Engineering' },
    { id: 'dept2', name: 'Sales' },
];

const mockRequisition = {
    id: 'req1',
    job_title: 'Software Engineer',
    department_id: 'dept1',
    location: 'Remote',
    employment_type: 'Full-time',
    min_salary: 100000,
    max_salary: 150000,
    currency: 'USD',
    has_equity_bonus: true,
    budget_code: 'ENG-2024',
    justification: 'Team expansion.',
};

// ─── Helper: query form fields by name attribute ──────────────────────────────
// The component renders labels WITHOUT htmlFor/id linkage, so getByLabelText()
// fails. Querying by [name] is the reliable alternative.
const field = (container, name) => container.querySelector(`[name="${name}"]`);

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('RequisitionForm Component', () => {
    let queryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, staleTime: 0 },
            },
        });
        deptApi.getDepartments.mockResolvedValue(mockDepartments);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'hiring_manager', department_id: 'dept1' },
        });
        mockUseParams.mockReturnValue({});
    });

    const renderComponent = (id = null) => {
        mockUseParams.mockReturnValue(id ? { id } : {});

        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[id ? `/requisitions/${id}/edit` : '/requisitions/new']}>
                    <Routes>
                        <Route path="/requisitions/new" element={<RequisitionForm />} />
                        <Route path="/requisitions/:id/edit" element={<RequisitionForm />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    // ─── Rendering ──────────────────────────────────────────────────────────────
    it('renders create mode correctly', async () => {
        const { container } = renderComponent();
        expect(screen.getByText('Request New Hire')).toBeInTheDocument();
        await waitFor(() => {
            expect(field(container, 'job_title')).toHaveValue('');
            expect(field(container, 'department_id')).toHaveValue('dept1');
        });
    });

    it('renders edit mode correctly', async () => {
        reqApi.getRequisition.mockResolvedValue(mockRequisition);
        const { container } = renderComponent('req1');

        expect(screen.getByText('Loading form...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Edit Requisition')).toBeInTheDocument();
            expect(field(container, 'job_title')).toHaveValue('Software Engineer');
            expect(field(container, 'department_id')).toHaveValue('dept1');
            expect(field(container, 'location')).toHaveValue('Remote');
            expect(field(container, 'min_salary')).toHaveValue(100000);
            expect(field(container, 'has_equity_bonus')).toBeChecked();
        });
    });

    // ─── Input Changes ──────────────────────────────────────────────────────────
    it('handles form input changes', async () => {
        const { container } = renderComponent();
        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());

        fireEvent.change(field(container, 'job_title'), { target: { name: 'job_title', value: 'New Engineer' } });
        fireEvent.change(field(container, 'location'), { target: { name: 'location', value: 'New York' } });
        fireEvent.click(field(container, 'has_equity_bonus'));

        expect(field(container, 'job_title')).toHaveValue('New Engineer');
        expect(field(container, 'location')).toHaveValue('New York');
        // In create mode has_equity_bonus defaults to false; clicking it once toggles it to true
        expect(field(container, 'has_equity_bonus')).toBeChecked();
    });

    // ─── Create Submit ──────────────────────────────────────────────────────────
    it('submits create requisition successfully', async () => {
        reqApi.createRequisition.mockResolvedValue({});
        const { container } = renderComponent();
        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());

        fireEvent.change(field(container, 'job_title'), { target: { name: 'job_title', value: 'Dev' } });
        fireEvent.change(field(container, 'location'), { target: { name: 'location', value: 'Remote' } });
        fireEvent.change(field(container, 'department_id'), { target: { name: 'department_id', value: 'dept1' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save as Draft/i }));

        await waitFor(() => {
            expect(reqApi.createRequisition).toHaveBeenCalledWith(expect.objectContaining({
                job_title: 'Dev',
                location: 'Remote',
            }));
            expect(mockNavigate).toHaveBeenCalledWith('/requisitions');
        });
    });

    // ─── Update Submit ──────────────────────────────────────────────────────────
    it('submits update requisition successfully', async () => {
        reqApi.getRequisition.mockResolvedValue(mockRequisition);
        reqApi.updateRequisition.mockResolvedValue({});
        const { container } = renderComponent('req1');

        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());
        fireEvent.change(field(container, 'job_title'), { target: { name: 'job_title', value: 'Sr Engineer' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save as Draft/i }));

        await waitFor(() => {
            expect(reqApi.updateRequisition).toHaveBeenCalledWith('req1', expect.objectContaining({
                job_title: 'Sr Engineer',
            }));
            expect(mockNavigate).toHaveBeenCalledWith('/requisitions/req1');
        });
    });

    // ─── Salary Parsing ─────────────────────────────────────────────────────────
    it('handles salary parsing and submission', async () => {
        reqApi.createRequisition.mockResolvedValue({});
        const { container } = renderComponent();
        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());

        fireEvent.change(field(container, 'job_title'), { target: { name: 'job_title', value: 'Dev' } });
        fireEvent.change(field(container, 'department_id'), { target: { name: 'department_id', value: 'dept1' } });
        fireEvent.change(field(container, 'location'), { target: { name: 'location', value: 'Remote' } });
        fireEvent.change(field(container, 'min_salary'), { target: { name: 'min_salary', value: '90000' } });
        fireEvent.change(field(container, 'max_salary'), { target: { name: 'max_salary', value: '120000' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save as Draft/i }));

        await waitFor(() => {
            expect(reqApi.createRequisition).toHaveBeenCalledWith(expect.objectContaining({
                min_salary: 90000,
                max_salary: 120000,
            }));
        });
    });

    // ─── API Error on Load ──────────────────────────────────────────────────────
    it('handles API errors on load', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        reqApi.getRequisition.mockRejectedValue(new Error('Fetch Fail'));

        renderComponent('req1');

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to load requisition');
            expect(screen.queryByText('Loading form...')).not.toBeInTheDocument();
        });
        alertSpy.mockRestore();
    });

    // ─── API Error on Submit ────────────────────────────────────────────────────
    it('handles API errors on submit', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        reqApi.createRequisition.mockRejectedValue(new Error('Submit Fail'));

        const { container } = renderComponent();
        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());

        fireEvent.change(field(container, 'job_title'), { target: { name: 'job_title', value: 'Dev' } });
        fireEvent.change(field(container, 'department_id'), { target: { name: 'department_id', value: 'dept1' } });
        fireEvent.change(field(container, 'location'), { target: { name: 'location', value: 'Remote' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save as Draft/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to submit requisition');
        });
        alertSpy.mockRestore();
    });

    it('handles API errors on update submission', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        reqApi.getRequisition.mockResolvedValue(mockRequisition);
        reqApi.updateRequisition.mockRejectedValue(new Error('Update Fail'));

        const { container } = renderComponent('req1');
        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());

        fireEvent.submit(screen.getByRole('button', { name: /Save as Draft/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to update requisition');
        });
        alertSpy.mockRestore();
    });

    // ─── Cancel Navigation ──────────────────────────────────────────────────────
    it('navigates away on cancel', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Cancel'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(mockNavigate).toHaveBeenCalledWith('/requisitions');
    });

    // ─── Initial Data Fallbacks ─────────────────────────────────────────────────
    it('covers initial data fallbacks', async () => {
        reqApi.getRequisition.mockResolvedValue({ id: 'req1' }); // sparse — missing most fields
        const { container } = renderComponent('req1');
        await waitFor(() => {
            expect(field(container, 'job_title')).toHaveValue('');
            expect(field(container, 'employment_type')).toHaveValue('Full-time');
        });
    });

    it('covers auto-assignment of department_id when user updates (L55)', async () => {
        // Start with no user or no department_id
        const authSpy = vi.spyOn(authContext, 'useAuth');
        authSpy.mockReturnValue({ user: null });

        const { rerender, container } = renderComponent();

        await waitFor(() => expect(field(container, 'department_id')).toHaveValue(''));

        // Update auth state to have a user with department_id
        authSpy.mockReturnValue({ user: { department_id: 'dept2' } });

        // Rerender to trigger useEffect
        rerender(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/requisitions/new']}>
                    <Routes>
                        <Route path="/requisitions/new" element={<RequisitionForm />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(field(container, 'department_id')).toHaveValue('dept2');
        });
    });

    it('covers null salary branches (L72-73)', async () => {
        reqApi.createRequisition.mockResolvedValue({});
        const { container } = renderComponent();
        await waitFor(() => expect(field(container, 'job_title')).toBeInTheDocument());

        fireEvent.change(field(container, 'job_title'), { target: { name: 'job_title', value: 'Dev' } });
        fireEvent.change(field(container, 'department_id'), { target: { name: 'department_id', value: 'dept1' } });
        fireEvent.change(field(container, 'location'), { target: { name: 'location', value: 'Remote' } });
        // Salaries left empty

        fireEvent.submit(screen.getByRole('button', { name: /Save as Draft/i }));

        await waitFor(() => {
            expect(reqApi.createRequisition).toHaveBeenCalledWith(expect.objectContaining({
                min_salary: null,
                max_salary: null
            }));
        });
    });
});