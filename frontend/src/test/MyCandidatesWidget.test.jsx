import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyCandidatesWidget from '../components/MyCandidatesWidget';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api/candidates', () => ({
    getCandidates: vi.fn(),
}));

import { getCandidates } from '../api/candidates';

const mockCandidates = [
    { id: '1', first_name: 'Alice', last_name: 'Smith', current_position: 'Frontend', created_at: '2023-10-10T10:00:00.000Z' },
    { id: '2', first_name: 'Bob', last_name: 'Jones', current_position: '', created_at: '2023-10-09T10:00:00.000Z' },
    { id: '3', first_name: 'Charlie', last_name: 'Brown', current_position: 'Backend', created_at: '2023-10-11T10:00:00.000Z' }, // Newest
    { id: '4', first_name: 'Diana', last_name: 'Prince', current_position: 'Designer', created_at: '2023-10-08T10:00:00.000Z' },
    { id: '5', first_name: 'Eve', last_name: 'Adams', current_position: 'PM', created_at: '2023-10-07T10:00:00.000Z' },
    { id: '6', first_name: 'Frank', last_name: 'Castle', current_position: 'Security', created_at: '2023-01-01T10:00:00.000Z' }, // Oldest
];

function renderWidget() {
    return render(
        <BrowserRouter>
            <MyCandidatesWidget />
        </BrowserRouter>
    );
}

describe('MyCandidatesWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading pulse initially', () => {
        getCandidates.mockReturnValue(new Promise(() => { }));
        const { container } = renderWidget();
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('displays the empty state when no candidates exist', async () => {
        getCandidates.mockResolvedValue([]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No recent candidates')).toBeInTheDocument();
        });
    });

    it('displays a maximum of 5 recent candidates, sorted by created_at desc', async () => {
        getCandidates.mockResolvedValue([...mockCandidates]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('New Candidates')).toBeInTheDocument();
        });

        // Frank is the oldest so he should be sliced out
        expect(screen.queryByText(/Frank/)).not.toBeInTheDocument();

        // The top 5 should be present
        expect(screen.getByText(/Alice/)).toBeInTheDocument();
        expect(screen.getByText(/Charlie/)).toBeInTheDocument(); // Charlie is newest

        // Check order loosely by looking for the current_position texts which are unique enough
        const roles = screen.getAllByText(/Frontend|Backend|Designer|PM|No Title/);
        // Sorted created_at DESC chronologically 
        // 11th: Charlie (Backend), 10th: Alice (Frontend), 9th: Bob (No Title), 8th: Diana (Designer), 7th: Eve (PM)
        expect(roles[0].textContent.trim()).toBe('Backend');
        expect(roles[1].textContent.trim()).toBe('Frontend');
        expect(roles[2].textContent.trim()).toBe('No Title');
        expect(roles[3].textContent.trim()).toBe('Designer');
        expect(roles[4].textContent.trim()).toBe('PM');
    });

    it('falls back to "No Title" when current_position is essentially falsy', async () => {
        getCandidates.mockResolvedValue([mockCandidates[1]]); // Bob
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No Title')).toBeInTheDocument();
        });
    });

    it('navigates to /candidates when "View All" is clicked', async () => {
        getCandidates.mockResolvedValue([]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('View All')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('View All'));
        expect(mockNavigate).toHaveBeenCalledWith('/candidates');
    });

    it('navigates to specific candidate page when clicked', async () => {
        const alice = mockCandidates.find(c => c.first_name === 'Alice');
        getCandidates.mockResolvedValue([alice]);
        renderWidget();

        await waitFor(() => {
            expect(screen.getByText(/Alice/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Alice/));
        expect(mockNavigate).toHaveBeenCalledWith('/candidates/1');
    });

    it('handles api errors gracefully and shows empty state', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        getCandidates.mockRejectedValue(new Error('API failure'));

        renderWidget();

        await waitFor(() => {
            expect(screen.getByText('No recent candidates')).toBeInTheDocument();
        });

        spy.mockRestore();
    });
});
