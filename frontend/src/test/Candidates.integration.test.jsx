import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Candidates from '../pages/Candidates';
import { AuthProvider } from '../context/AuthContext';
import { server } from './server';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useNavigate and useSearchParams
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => {
            const [searchParams] = actual.useSearchParams();
            return [searchParams, mockSetSearchParams];
        },
    };
});

// Mock components to simplify coverage targeting
vi.mock('../components/CandidateForm', () => ({
    default: ({ onSuccess }) => <button onClick={() => onSuccess()}>Manual Success</button>
}));
vi.mock('../components/ResumeUpload', () => ({
    default: ({ onUploadSuccess }) => <button onClick={() => onUploadSuccess()}>Upload Success</button>
}));

// Mock window.confirm
window.confirm = vi.fn(() => true);
window.alert = vi.fn();

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderCandidates = (props = {}, initialEntries = ['/candidates']) => {
    return render(
        <QueryClientProvider client={createTestQueryClient()}>
            <MemoryRouter initialEntries={initialEntries}>
                <AuthProvider>
                    <Routes>
                        <Route path="/candidates" element={<Candidates {...props} />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe('Candidates Page Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-token');
        server.use(
            http.get('*/users/me', () => {
                return HttpResponse.json({
                    id: 'u1',
                    email: 'owner@example.com',
                    full_name: 'Owner User',
                    role: 'owner',
                    is_active: true
                });
            })
        );
    });

    it('renders candidate list successfully', async () => {
        const mockCandidates = [
            { id: 'c1', first_name: 'Alice', last_name: 'Wonderland', current_position: 'Dev' },
            { id: 'c2', first_name: 'Bob', last_name: 'Builder', current_position: 'Architect' }
        ];

        server.use(http.get('*/candidates/', () => HttpResponse.json(mockCandidates)));

        renderCandidates();

        await waitFor(() => {
            expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
        });

        expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    });

    it('handles empty candidate list', async () => {
        server.use(http.get('*/candidates/', () => HttpResponse.json([])));
        renderCandidates();
        await waitFor(() => {
            expect(screen.getByText(/no candidates yet/i)).toBeInTheDocument();
        });
    });

    it('filters candidates based on search query', async () => {
        const mockCandidates = [
            { id: 'c1', first_name: 'Alice', last_name: 'Wonderland', email: 'alice@example.com' },
            { id: 'c2', first_name: 'Bob', last_name: 'Builder', email: 'bob@example.com' }
        ];
        server.use(http.get('*/candidates/', () => HttpResponse.json(mockCandidates)));

        renderCandidates();
        await waitFor(() => expect(screen.getByText('Alice Wonderland')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Bob' } });

        expect(screen.queryByText('Alice Wonderland')).not.toBeInTheDocument();
        expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    });

    it('handles candidate deletion success and failure', async () => {
        const mockCandidates = [{ id: 'c1', first_name: 'Alice', last_name: 'Wonderland' }];
        server.use(http.get('*/candidates/', () => HttpResponse.json(mockCandidates)));

        renderCandidates();
        await waitFor(() => expect(screen.getByText('Alice Wonderland')).toBeInTheDocument());

        const row = screen.getByText('Alice Wonderland').closest('tr');
        const menuButton = within(row).getByTestId('action-menu-trigger');
        fireEvent.click(menuButton);

        // Success Case
        server.use(http.delete('*/candidates/c1', () => new HttpResponse(null, { status: 204 })));
        fireEvent.click(screen.getByText(/delete/i));
        await waitFor(() => {
            expect(screen.queryByText('Alice Wonderland')).not.toBeInTheDocument();
        });

        // Failure Case
        server.use(http.get('*/candidates/', () => HttpResponse.json(mockCandidates)));
        renderCandidates(); // Re-render to test failure
        await waitFor(() => expect(screen.getByText('Alice Wonderland')).toBeInTheDocument());

        const row2 = screen.getByText('Alice Wonderland').closest('tr');
        fireEvent.click(within(row2).getByTestId('action-menu-trigger'));

        server.use(http.delete('*/candidates/c1', () => new HttpResponse(null, { status: 500 })));
        fireEvent.click(screen.getByText(/delete/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Failed to delete candidate.");
        });
    });

    it('filters candidates using FilterPanel', async () => {
        const mockCandidates = [
            { id: 'c1', first_name: 'Alice', last_name: 'Wonderland', notice_period: 30, years_of_experience: 5 },
            { id: 'c2', first_name: 'Bob', last_name: 'Builder', notice_period: 0, years_of_experience: 1 }
        ];
        server.use(http.get('*/candidates/', () => HttpResponse.json(mockCandidates)));

        renderCandidates();
        await waitFor(() => expect(screen.getByText('Alice Wonderland')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /filters/i }));
        fireEvent.click(screen.getByRole('button', { name: /notice period/i }));
        fireEvent.click(screen.getByText('30'));

        expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
        expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /clear/i }));
        expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    });

    it('toggles column visibility', async () => {
        const mockCandidates = [{ id: 'c1', first_name: 'Alice', last_name: 'Wonderland', current_company: 'Lewis Ltd' }];
        server.use(http.get('*/candidates/', () => HttpResponse.json(mockCandidates)));

        renderCandidates();
        await waitFor(() => expect(screen.getByText('Lewis Ltd')).toBeInTheDocument());

        const columnTrigger = screen.getByRole('button', { name: /columns/i });
        fireEvent.click(columnTrigger);
        fireEvent.click(screen.getByLabelText(/current company/i));
        fireEvent.click(columnTrigger); // Close dropdown

        expect(screen.queryByText('Lewis Ltd')).not.toBeInTheDocument();
    });

    it('handles Add Candidate modal tabs and success callbacks', async () => {
        server.use(http.get('*/candidates/', () => HttpResponse.json([])));
        renderCandidates();
        await waitFor(() => expect(screen.getByText(/no candidates yet/i)).toBeInTheDocument());

        fireEvent.click(screen.getByText(/\+ Add Candidate/i));

        // Tab switching
        const manualTab = screen.getByRole('button', { name: /manual entry/i });
        fireEvent.click(manualTab);
        expect(manualTab).toHaveClass('border-[#00C853]');

        // Manual success
        fireEvent.click(screen.getByText('Manual Success'));
        await waitFor(() => {
            expect(screen.queryByText('Add New Candidate')).not.toBeInTheDocument();
        });

        // Re-open and test Upload success
        fireEvent.click(screen.getByText(/add your first candidate/i));
        fireEvent.click(screen.getByRole('button', { name: /upload resume/i }));
        fireEvent.click(screen.getByText('Upload Success'));
        await waitFor(() => {
            expect(screen.queryByText('Add New Candidate')).not.toBeInTheDocument();
        });

        // Test Close button (in upload tab footer)
        fireEvent.click(screen.getByText(/add your first candidate/i));
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByText('Add New Candidate')).not.toBeInTheDocument();
    });

    it('shows and clears status filter banner', async () => {
        server.use(http.get('*/candidates/', () => HttpResponse.json([])));
        renderCandidates({}, ['/candidates?status=hired']);

        await waitFor(() => {
            expect(screen.getByText(/filter active/i)).toBeInTheDocument();
            expect(screen.getByText('hired')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /clear status filter/i }));
        expect(mockSetSearchParams).toHaveBeenCalledWith({});
    });

    it('handles fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        server.use(http.get('*/candidates/', () => new HttpResponse(null, { status: 500 })));

        renderCandidates();

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch candidates", expect.any(Error));
        });
        consoleSpy.mockRestore();
    });
});
