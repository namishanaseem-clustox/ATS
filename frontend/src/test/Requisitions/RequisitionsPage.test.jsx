import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequisitionsPage from '../../pages/Requisitions/RequisitionsPage';
import * as authContext from '../../context/AuthContext';
import * as reqApi from '../../api/requisitions';

vi.mock('../../api/requisitions');
vi.mock('../../components/Breadcrumb', () => ({
    default: ({ items }) => <div data-testid="breadcrumb">{items.map(i => i.label).join(' > ')}</div>
}));

const mockRequisitions = [
    {
        id: 'req1',
        req_code: 'REQ-001',
        job_title: 'Software Engineer',
        status: 'Open',
        location: 'Remote',
        employment_type: 'Full-time',
        created_at: '2023-01-01T10:00:00Z'
    },
    {
        id: 'req2',
        req_code: 'REQ-002',
        job_title: 'Sales Manager',
        status: 'Draft',
        location: 'New York',
        employment_type: 'Part-time',
        created_at: '2023-02-01T10:00:00Z'
    }
];

describe('RequisitionsPage Component', () => {
    let queryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, staleTime: 0 },
            },
        });
        reqApi.getRequisitions.mockResolvedValue(mockRequisitions);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'hiring_manager' }
        });
    });

    const renderComponent = () => render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <RequisitionsPage />
            </MemoryRouter>
        </QueryClientProvider>
    );

    it('renders loading and error states', async () => {
        reqApi.getRequisitions.mockReturnValue(new Promise(() => { })); // pending
        renderComponent();
        expect(screen.getByText(/Loading requisitions.../i)).toBeInTheDocument();

        vi.clearAllMocks();
        queryClient.clear();
        reqApi.getRequisitions.mockRejectedValue(new Error('Fail'));
        renderComponent();
        await waitFor(() => expect(screen.getByText(/Failed to load requisitions/i)).toBeInTheDocument());
    });

    it('renders the requisitions list for hiring manager', async () => {
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('REQ-001')).toBeInTheDocument();
            expect(screen.getByText('Software Engineer')).toBeInTheDocument();
            expect(screen.getByText('REQ-002')).toBeInTheDocument();
            expect(screen.getByText('Sales Manager')).toBeInTheDocument();
            expect(screen.getByText(/Manage your hiring requests/i)).toBeInTheDocument();
            expect(screen.getAllByText(/Request New Hire/i).length).toBeGreaterThan(0);
        });
    });

    it('renders for non-hiring manager (e.g., HR)', async () => {
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { role: 'hr' }
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText(/Review and approve open job requisitions/i)).toBeInTheDocument();
            expect(screen.queryByText('+ Request New Hire')).not.toBeInTheDocument();
        });
    });

    it('filters by search query', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('REQ-001'));

        const searchInput = screen.getByPlaceholderText(/Search by req code/i);
        fireEvent.change(searchInput, { target: { value: 'Sales' } });

        expect(screen.queryByText('REQ-001')).not.toBeInTheDocument();
        expect(screen.getByText('REQ-002')).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'Remote' } });
        expect(screen.getByText('REQ-001')).toBeInTheDocument();
        expect(screen.queryByText('REQ-002')).not.toBeInTheDocument();
    });

    it('filters by status', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('REQ-001'));

        // The filter panel is hidden until the 'Filters' button is clicked
        fireEvent.click(screen.getByText('Filters'));

        // Multiple elements have text "Status" — target the sidebar tab button
        // which uses a <span class="truncate"> inside a <button>
        await waitFor(() => screen.getAllByText('Status'));
        const statusTab = screen.getAllByText('Status').find(el => el.classList.contains('truncate'));
        fireEvent.click(statusTab);

        // Now the Draft checkbox should be in the DOM
        await waitFor(() => screen.getByLabelText(/Draft/i));
        fireEvent.click(screen.getByLabelText(/Draft/i));

        await waitFor(() => {
            expect(screen.queryByText('REQ-001')).not.toBeInTheDocument();
            expect(screen.getByText('REQ-002')).toBeInTheDocument();
        });
    });

    it('filters by location', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('REQ-001'));

        // Open the filter panel first
        fireEvent.click(screen.getByText('Filters'));

        // Wait for panel; click 'Location' sidebar tab
        await waitFor(() => screen.getByText('Location'));
        fireEvent.click(screen.getByText('Location'));

        // Now the New York checkbox should be in the DOM
        await waitFor(() => screen.getByLabelText(/New York/i));
        fireEvent.click(screen.getByLabelText(/New York/i));

        await waitFor(() => {
            expect(screen.queryByText('REQ-001')).not.toBeInTheDocument();
            expect(screen.getByText('REQ-002')).toBeInTheDocument();
        });
    });

    it('handles column selection', async () => {
        renderComponent();
        await waitFor(() => screen.getByText('REQ-001'));

        // Open ColumnSelector
        const selectorBtn = screen.getByRole('button', { name: /Columns/i });
        fireEvent.click(selectorBtn);

        // Toggle 'Job Title' (visible by default)
        const titleCheckbox = screen.getByLabelText(/Job Title/i);
        fireEvent.click(titleCheckbox);

        expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();

        // Required columns cannot be toggled (logic in L115)
        const reqCodeCheckbox = screen.getByLabelText(/Req Code/i);
        fireEvent.click(reqCodeCheckbox);
        expect(screen.getByText('REQ-001')).toBeInTheDocument(); // Still there
    });

    it('renders empty states', async () => {
        reqApi.getRequisitions.mockResolvedValue([]);
        renderComponent();
        await waitFor(() => expect(screen.getByText(/No requisitions found/i)).toBeInTheDocument());
        expect(screen.getByText(/There are currently no job requisitions/i)).toBeInTheDocument();

        // With filters
        fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Something' } });
        await waitFor(() => expect(screen.getByText(/Adjust your search or filters/i)).toBeInTheDocument());
    });

    it('covers miscellaneous branches and filter clearing', async () => {
        reqApi.getRequisitions.mockResolvedValue([{
            ...mockRequisitions[0],
            created_at: '2023-01-01T10:00:00Z',
            status: 'Approved'
        }, {
            ...mockRequisitions[1],
            status: 'Filled'
        }]);
        renderComponent();

        // Wait for table to load — target the status badge (rounded-full) not the filter label
        await waitFor(() => {
            const approvedBadge = screen.getAllByText('Approved').find(el => el.classList.contains('rounded-full'));
            expect(approvedBadge).toBeInTheDocument();
        });

        // Open filter panel and activate a filter so "Clear" appears
        fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
        await waitFor(() => screen.getByLabelText(/Filled/i));
        fireEvent.click(screen.getByLabelText(/Filled/i));

        // Click 'Clear' to reset filters
        await waitFor(() => screen.getByTitle(/Clear all filters/i));
        fireEvent.click(screen.getByTitle(/Clear all filters/i));

        // After clearing, both badges should be back in the table
        // Filter panel is still open so both label text AND badge text exist —
        // target the rounded-full badge spans specifically
        await waitFor(() => {
            const approvedBadge = screen.getAllByText('Approved').find(el => el.classList.contains('rounded-full'));
            const filledBadge = screen.getAllByText('Filled').find(el => el.classList.contains('rounded-full'));
            expect(approvedBadge).toHaveClass('bg-blue-100');
            expect(filledBadge).toHaveClass('bg-purple-100');
        });
    });

    it('covers final edge cases (L35, L68, L195)', async () => {
        // L35: null response → treated as empty list
        reqApi.getRequisitions.mockResolvedValue(null);
        const { rerender } = renderComponent();
        await waitFor(() => expect(screen.getByText(/No requisitions found/i)).toBeInTheDocument());

        // Switch to a requisition with Unknown status and null location
        const customReq = [{
            id: 'req3',
            req_code: 'AAA',
            job_title: 'BBB',
            status: 'Unknown',
            location: null,
            created_at: '2023-01-01T'
        }];
        reqApi.getRequisitions.mockResolvedValue(customReq);
        queryClient.clear();

        rerender(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <RequisitionsPage />
                </MemoryRouter>
            </QueryClientProvider>
        );

        await waitFor(() => screen.getByText('AAA'));

        // L195: Unknown status renders the fallback badge — assert BEFORE filtering
        await waitFor(() => {
            const unknownBadge = screen.getAllByText('Unknown').find(el => el.classList.contains('rounded-full'));
            expect(unknownBadge).toHaveClass('bg-yellow-100');
        });

        // L68: search text that doesn't match req_code or job_title forces location check (null)
        const searchInput = screen.getByPlaceholderText(/Search/i);
        fireEvent.change(searchInput, { target: { value: 'CCC' } });
        await waitFor(() => expect(screen.queryByText('AAA')).not.toBeInTheDocument());
    });
});