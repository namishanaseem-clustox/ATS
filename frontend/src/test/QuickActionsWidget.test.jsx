import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuickActionsWidget from '../components/QuickActionsWidget';

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

function renderWidget(role = 'owner') {
    useAuth.mockReturnValue({
        user: { role },
    });

    return render(
        <BrowserRouter>
            <QuickActionsWidget />
        </BrowserRouter>
    );
}

describe('QuickActionsWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all 4 actions for owner role', () => {
        renderWidget('owner');
        expect(screen.getByText('Add Candidate')).toBeInTheDocument();
        expect(screen.getByText('Create Job Post')).toBeInTheDocument();
        expect(screen.getByText('Schedule Interview')).toBeInTheDocument();
        expect(screen.getByText('New Requisition')).toBeInTheDocument();
    });

    it('renders exactly 3 actions for hiring_manager role (no Create Job Post)', () => {
        renderWidget('hiring_manager');
        expect(screen.getByText('Add Candidate')).toBeInTheDocument();
        expect(screen.queryByText('Create Job Post')).not.toBeInTheDocument();
        expect(screen.getByText('Schedule Interview')).toBeInTheDocument();
        expect(screen.getByText('New Requisition')).toBeInTheDocument();
    });

    it('renders nothing (returns null) for interviewer role', () => {
        const { container } = renderWidget('interviewer');
        // Because returns null, the container should be empty
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText('QUICK ACTIONS')).not.toBeInTheDocument();
    });

    it('navigates to the correct routes when action buttons are clicked', () => {
        renderWidget('owner');

        fireEvent.click(screen.getByText('Add Candidate').parentElement);
        expect(mockNavigate).toHaveBeenCalledWith('/candidates');

        fireEvent.click(screen.getByText('Create Job Post').parentElement);
        expect(mockNavigate).toHaveBeenCalledWith('/jobs/new');

        fireEvent.click(screen.getByText('Schedule Interview').parentElement);
        expect(mockNavigate).toHaveBeenCalledWith('/tasks');

        fireEvent.click(screen.getByText('New Requisition').parentElement);
        expect(mockNavigate).toHaveBeenCalledWith('/requisitions/new');
    });
});
