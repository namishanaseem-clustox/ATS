import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import App from '../App';

// Mock Drag and Drop context
vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children, onDragEnd }) => {
        window.mockOnDragEnd = onDragEnd;
        return <div data-testid="dnd-context">{children}</div>;
    },
    Droppable: ({ children, droppableId, type }) => {
        return children({
            droppableProps: { 'data-testid': `droppable-${type}-${droppableId}` },
            innerRef: vi.fn(),
            placeholder: null,
        }, { isDraggingOver: false });
    },
    Draggable: ({ children, draggableId }) => {
        return children({
            draggableProps: { 'data-testid': `draggable-${draggableId}` },
            dragHandleProps: {},
            innerRef: vi.fn(),
        }, { isDragging: false });
    },
}));

const mockJob = {
    id: 'job-123',
    title: 'Senior Developer',
    pipeline_config: [{ id: 'stage-1', name: 'New Candidates' }, { id: 'stage-2', name: 'Interview' }]
};

const mockJobApplication = {
    id: 'app-456',
    candidate: { id: 'cand-456', first_name: 'John', last_name: 'Doe' },
    current_stage: 'stage-1'
};

describe('E2E Test: Candidate Pipeline', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        server.resetHandlers();
        localStorage.clear();
        vi.clearAllMocks();
        window.mockOnDragEnd = null;
    });

    it('Login as HM -> Open Job -> Drag Candidate to Interview stage', async () => {
        server.use(
            http.post('*/token', () => HttpResponse.json({ access_token: 'fake' })),
            http.get('*/users/me', () => HttpResponse.json({ id: 'hm-1', role: 'hiring_manager' })),
            http.get('*/jobs', () => HttpResponse.json([mockJob])),
            http.get('*/jobs/job-123', () => HttpResponse.json(mockJob)),
            http.get('*/jobs/job-123/candidates', () => HttpResponse.json([mockJobApplication])),
            http.put('*/jobs/job-123/candidates/cand-456/stage', async ({ request }) => {
                const body = await request.json();
                return HttpResponse.json({ ...mockJobApplication, current_stage: body.stage });
            })
        );

        render(<App />);

        // --- STEP 1: Login ---
        await user.type(screen.getByLabelText(/Email address/i), 'hm@example.com');
        await user.type(screen.getByLabelText(/Password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /Sign in/i }));

        // --- STEP 2: Navigate to Job ---
        const jobsLink = await screen.findByRole('link', { name: /^Jobs$/i });
        await user.click(jobsLink);

        // Click the job and WAIT for the pipeline tab to indicate the new page is ready
        const jobEntries = await screen.findAllByText('Senior Developer');
        await user.click(jobEntries[0]);

        // Wait for unique content of the Job Detail page
        const pipelineTab = await screen.findByRole('button', { name: /Pipeline/i });
        await user.click(pipelineTab);

        // --- STEP 3: Interaction ---
        // Verify initial state
        expect(await screen.findByText(/John Doe/i)).toBeInTheDocument();

        // Simulate DnD
        await waitFor(() => {
            if (!window.mockOnDragEnd) throw new Error('DND not initialized');
            window.mockOnDragEnd({
                draggableId: 'cand-456',
                source: { droppableId: 'stage-1' },
                destination: { droppableId: 'stage-2' },
                type: 'CANDIDATE'
            });
        });

        // --- STEP 4: Verification ---
        await waitFor(() => {
            const destStage = screen.getByTestId('droppable-CANDIDATE-stage-2');
            expect(destStage).toHaveTextContent(/John Doe/i);
        });
    });
});