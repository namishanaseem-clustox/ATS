import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequisitionDetail from '../../pages/Requisitions/RequisitionDetail';
import * as authContext from '../../context/AuthContext';
import * as reqApi from '../../api/requisitions';

vi.mock('../../components/Breadcrumb', () => ({
    default: ({ items }) => <div data-testid="breadcrumb">{items.map(i => i.label).join(' > ')}</div>
}));

vi.mock('../../api/requisitions');

const mockRequisition = {
    id: 'req1',
    job_title: 'Software Engineer',
    req_code: 'REQ-001',
    status: 'Draft',
    department_name: 'Engineering',
    location: 'Remote',
    employment_type: 'full_time',
    justification: 'Team expansion.',
    min_salary: 100000,
    max_salary: 150000,
    currency: 'USD',
    has_equity_bonus: true,
    budget_code: 'ENG-2024',
    rejection_reason: null,
    audit_logs: [
        {
            id: 1,
            action: 'Created requisition in Draft',
            timestamp: '2023-01-01T10:00:00Z',
            user: { full_name: 'Jane HM' }
        },
        {
            id: 2,
            action: 'Updated requisition',
            timestamp: '2023-01-01T11:00:00Z',
            user: { full_name: 'Jane HM' }
        }
    ]
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

describe('RequisitionDetail Component', () => {
    let queryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, staleTime: 0 },
                mutations: { retry: false },
            },
        });
        reqApi.getRequisition.mockResolvedValue(mockRequisition);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'hiring_manager' }
        });
        window.confirm = vi.fn(() => true);
    });

    const renderComponent = (id = 'req1') => render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/requisitions/${id}`]}>
                <Routes>
                    <Route path="/requisitions/:id" element={<RequisitionDetail />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );

    it('renders requisition details correctly', async () => {
        renderComponent();

        expect(screen.getByText(/Loading details.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Software Engineer')).toBeInTheDocument();
            expect(screen.getByText('REQ-001')).toBeInTheDocument();
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Team expansion.')).toBeInTheDocument();
        });
    });

    it('handles error state or missing requisition', async () => {
        reqApi.getRequisition.mockResolvedValue(null);
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/Error loading requisition./i)).toBeInTheDocument();
        });
    });

    it('allows HM to submit a Draft requisition', async () => {
        reqApi.submitRequisition.mockResolvedValue({});
        renderComponent();

        await waitFor(() => screen.getByText('Submit to HR'));
        fireEvent.click(screen.getByText('Submit to HR'));

        await waitFor(() => {
            // React Query passes mutation context as 2nd arg — ignore with expect.anything()
            expect(reqApi.submitRequisition).toHaveBeenCalledWith('req1', expect.anything());
        });
    });

    it('allows HR to approve a Pending_HR requisition', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_HR' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        reqApi.approveRequisition.mockResolvedValue({});
        renderComponent();

        await waitFor(() => screen.getByText('Approve'));
        fireEvent.click(screen.getByText('Approve'));

        await waitFor(() => {
            expect(reqApi.approveRequisition).toHaveBeenCalledWith('req1', expect.anything());
        });
    });

    it('allows Owner to approve a Pending_Owner requisition', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_Owner' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'owner' } });
        reqApi.approveRequisition.mockResolvedValue({});
        renderComponent();

        await waitFor(() => screen.getByText('Approve'));
        fireEvent.click(screen.getByText('Approve'));

        await waitFor(() => {
            expect(reqApi.approveRequisition).toHaveBeenCalledWith('req1', expect.anything());
        });
    });

    it('handles rejection flow', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_HR' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        reqApi.rejectRequisition.mockResolvedValue({});
        renderComponent();

        await waitFor(() => screen.getByText('Reject'));
        fireEvent.click(screen.getByText('Reject'));

        // Submit button disabled when reason is empty
        expect(screen.getByText('Reject Requisition', { selector: 'button' })).toBeDisabled();

        const textarea = screen.getByPlaceholderText(/Provide feedback/i);
        fireEvent.change(textarea, { target: { value: 'Incomplete info' } });

        expect(screen.getByText('Reject Requisition', { selector: 'button' })).not.toBeDisabled();
        fireEvent.click(screen.getByText('Reject Requisition', { selector: 'button' }));

        await waitFor(() => {
            // ✅ rejectRequisition receives exactly 2 args — no React Query context object
            expect(reqApi.rejectRequisition).toHaveBeenCalledWith('req1', 'Incomplete info');
            expect(screen.queryByText('Cancel', { selector: 'button' })).not.toBeInTheDocument();
        });
    });

    it('allows HR to convert Approved requisition to Job', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Approved' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        reqApi.convertRequisitionToJob.mockResolvedValue({ job_id: 'job456' });
        renderComponent();

        await waitFor(() => screen.getByText('Create Job Posting'));
        fireEvent.click(screen.getByText('Create Job Posting'));

        await waitFor(() => {
            expect(reqApi.convertRequisitionToJob).toHaveBeenCalledWith('req1', expect.anything());
            expect(mockNavigate).toHaveBeenCalledWith('/jobs/job456/edit');
        });
    });

    it('renders empty fields and handles edge cases', async () => {
        reqApi.getRequisition.mockResolvedValue({
            ...mockRequisition,
            job_title: null,
            audit_logs: [
                {
                    id: 3,
                    action: 'System action',
                    timestamp: '2023-01-01T12:00:00Z',
                    user: null
                },
                {
                    id: 4,
                    action: 'Old action',
                    timestamp: '2022-01-01T12:00:00Z',
                    user: { full_name: 'Former User' }
                }
            ],
            justification: null,
            min_salary: null,
            max_salary: null,
            budget_code: null,
            has_equity_bonus: false
        });
        renderComponent();

        await waitFor(() => {
            expect(screen.getByTestId('breadcrumb')).toHaveTextContent('Requisitions > Detail');
            expect(screen.getByText('No justification provided.')).toBeInTheDocument();
            expect(screen.getByText(/TBD\s*-\s*TBD/)).toBeInTheDocument();
            expect(screen.getByText('N/A')).toBeInTheDocument();
            expect(screen.getByText('System / Unknown User')).toBeInTheDocument();
            expect(screen.getByText('Former User')).toBeInTheDocument();
            expect(screen.getByText('Not Eligible')).toBeInTheDocument();
            expect(screen.getByText('Old action')).toBeInTheDocument();
        });
    });

    it('shows Filled status badge correctly', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Filled' });
        renderComponent();

        await waitFor(() => {
            const badge = screen.getByText('Filled');
            // Check for the purple classes (vitest-dom class check)
            expect(badge).toHaveClass('bg-purple-100');
        });
    });

    it('shows rejected status alerts', async () => {
        reqApi.getRequisition.mockResolvedValue({
            ...mockRequisition,
            status: 'Draft',
            rejection_reason: 'Budget too high'
        });
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Budget too high')).toBeInTheDocument();
        });
    });

    it('handles Open status and disabled job creation', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Open' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Job Posting Created')).toBeInTheDocument();
            expect(screen.getByText('Job Posting Created')).toBeDisabled();
        });
    });

    it('navigates to edit page when Edit button is clicked', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('Edit'));
        fireEvent.click(screen.getByText('Edit'));
        expect(mockNavigate).toHaveBeenCalledWith('/requisitions/req1/edit');
    });

    it('closes the reject modal when Cancel is clicked', async () => {
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_HR' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        renderComponent();

        await waitFor(() => screen.getByText('Reject'));
        fireEvent.click(screen.getByText('Reject'));

        expect(screen.getByText('Reject Requisition', { selector: 'h2' })).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel', { selector: 'button' }));

        await waitFor(() => {
            expect(screen.queryByText('Reject Requisition', { selector: 'h2' })).not.toBeInTheDocument();
        });
    });
});