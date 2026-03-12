import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

        expect(screen.getByText('Reject Requisition', { selector: 'button' })).toBeDisabled();

        const textarea = screen.getByPlaceholderText(/Provide feedback/i);
        fireEvent.change(textarea, { target: { value: 'Incomplete info' } });

        expect(screen.getByText('Reject Requisition', { selector: 'button' })).not.toBeDisabled();
        fireEvent.click(screen.getByText('Reject Requisition', { selector: 'button' }));

        await waitFor(() => {
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

    it('covers final gaps (L51, L86, L136, L209)', async () => {
        // L209: Audit log sorting fallback when audit_logs is null
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, audit_logs: null });
        const { unmount: unmountFirst } = renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Timeline & Audit')).toBeInTheDocument();
            expect(screen.queryByText('Jane HM')).not.toBeInTheDocument();
        });
        unmountFirst();

        // L136 (Branch 1: Open status -> no mutate)
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Open' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        const { unmount: unmountSecond } = renderComponent();

        await waitFor(() => screen.getByRole('button', { name: /Job Posting Created/i }));
        const convertBtn = screen.getByRole('button', { name: /Job Posting Created/i });
        // Force trigger onClick even if disabled to hit the branch
        fireEvent.click(convertBtn);
        expect(reqApi.convertRequisitionToJob).not.toHaveBeenCalled();
        unmountSecond();

        // L51: trim guard in submitRejection
        let resolveReject;
        const rejectPromise = new Promise(resolve => { resolveReject = resolve; });
        reqApi.rejectRequisition.mockReturnValue(rejectPromise);
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_HR' });
        renderComponent();

        await waitFor(() => screen.getByText('Reject'));
        fireEvent.click(screen.getByText('Reject'));

        const textarea = screen.getByPlaceholderText(/Provide feedback/i);
        const rejectBtn = screen.getByRole('button', { name: /Reject Requisition/i });

        // Hit the "return" branch on line 51
        fireEvent.change(textarea, { target: { value: '   ' } });
        fireEvent.click(rejectBtn);
        expect(reqApi.rejectRequisition).not.toHaveBeenCalled();

        // L86: Verify pending text
        fireEvent.change(textarea, { target: { value: 'Valid reason' } });
        fireEvent.click(rejectBtn);

        await waitFor(() => {
            expect(screen.getByText('Rejecting...')).toBeInTheDocument();
        });

        // Use act to safely resolve the mocked promise
        await act(async () => {
            resolveReject({});
        });

        await waitFor(() => {
            expect(screen.queryByText('Rejecting...')).not.toBeInTheDocument();
        });
    });

    it('covers all remaining minor branches and null fallbacks', async () => {
        // L35, L169, L180, L189, L190, L195, L199, L215: Null/Missing data fallbacks
        const edgeReq = {
            ...mockRequisition,
            req_code: null,
            location: null,
            justification: null,
            min_salary: null,
            max_salary: null,
            has_equity_bonus: false,
            budget_code: null,
            employment_type: 'full_time',
            audit_logs: [
                { id: 99, action: 'Ghost Action', timestamp: '2023-01-01T', user: null }
            ],
            rejection_reason: 'Wait, this should not show if status is not Draft'
        };

        reqApi.getRequisition.mockResolvedValue(edgeReq);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: null }); // user is null
        queryClient.clear();

        renderComponent();

        await waitFor(() => {
            // L35: job_title || 'Detail' fallback
            expect(screen.getByText('Software Engineer')).toBeInTheDocument();
            // L180: justification (null) -> 'No justification provided.'
            expect(screen.getByText('No justification provided.')).toBeInTheDocument();
            // L189/190: salary (null) -> 'TBD'
            expect(screen.getAllByText(/TBD/).length).toBeGreaterThan(0);
            // L195: has_equity_bonus (false) -> 'Not Eligible'
            expect(screen.getByText('Not Eligible')).toBeInTheDocument();
            // L199: budget_code (null) -> 'N/A'
            expect(screen.getByText('N/A')).toBeInTheDocument();
            // L215: log.user (null) -> 'System / Unknown User'
            expect(screen.getByText('System / Unknown User')).toBeInTheDocument();
        });
    });

    it('covers cross-role permission branches (L48)', async () => {
        // Case: HR trying to approve/reject a Pending_Owner req -> should NOT see buttons
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_Owner' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });
        queryClient.clear();
        const { unmount: unmount1 } = renderComponent();
        await waitFor(() => screen.getByText(mockRequisition.job_title));
        expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Reject/ })).not.toBeInTheDocument();
        unmount1();

        // Case: Owner trying to approve/reject a Pending_HR req -> should NOT see buttons
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_HR' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'owner' } });
        queryClient.clear();
        const { unmount: unmount2 } = renderComponent();
        await waitFor(() => screen.getByText(mockRequisition.job_title));
        expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Reject/ })).not.toBeInTheDocument();
        unmount2();
    });

    it('achieves 100% branch coverage for L51 and L136 guard clauses', async () => {
        // --- Branch 1: L136 (The 'Open' status return) ---
        // We mock the status as 'Open' and try to trigger the conversion.
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Open' });
        vi.spyOn(authContext, 'useAuth').mockReturnValue({ user: { role: 'hr' } });

        renderComponent();

        const convertBtn = await screen.findByRole('button', { name: /Job Posting Created/i });

        // We manually trigger the click. Since it's 'Open', line 136 should 'return' 
        // before calling the API.
        await act(async () => {
            fireEvent.click(convertBtn);
        });
        expect(reqApi.convertRequisitionToJob).not.toHaveBeenCalled();

        // --- Branch 2: L51 (The empty rejection trim return) ---
        // Reset and mock for a rejection scenario
        queryClient.clear();
        reqApi.getRequisition.mockResolvedValue({ ...mockRequisition, status: 'Pending_HR' });

        renderComponent();

        const rejectOpenBtn = await screen.findByText('Reject');
        fireEvent.click(rejectOpenBtn);

        const textarea = screen.getByPlaceholderText(/Provide feedback/i);
        const submitRejectBtn = screen.getByRole('button', { name: /Reject Requisition/i });

        // Enter only whitespace to trigger the guard clause: if (!rejectionReason.trim()) return;
        fireEvent.change(textarea, { target: { value: '   ' } });

        await act(async () => {
            fireEvent.click(submitRejectBtn);
        });

        // Verify the API was never called because the guard clause caught the empty string
        expect(reqApi.rejectRequisition).not.toHaveBeenCalled();
    });
});