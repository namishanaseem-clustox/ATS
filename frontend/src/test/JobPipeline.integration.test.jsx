import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobPipeline from '../components/JobPipeline';

// Mock dependencies
vi.mock('react-router-dom', () => ({
    useParams: () => ({ id: 'job-123' }),
}));

vi.mock('../api/jobs', () => ({
    updateCandidateScore: vi.fn(),
    syncPipelineFromTemplate: vi.fn(),
    changePipelineTemplate: vi.fn(),
}));

vi.mock('../api/pipeline', () => ({
    getPipelineTemplates: vi.fn(() => Promise.resolve([
        { id: 'template-1', name: 'Default Template' }
    ])),
}));

vi.mock('../utils/confetti', () => ({
    triggerConfetti: vi.fn(),
}));

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
    Draggable: ({ children, draggableId, index }) => {
        return children({
            draggableProps: { 'data-testid': `draggable-${draggableId}` },
            dragHandleProps: {},
            innerRef: vi.fn(),
        }, { isDragging: false });
    },
}));

describe('JobPipeline Integration Test', () => {
    const mockPipelineConfig = [
        { id: 'stage-1', name: 'New Candidates', color: '#ccc' },
        { id: 'stage-2', name: 'Interview', color: '#000' },
        { id: 'stage-3', name: 'Hired', color: '#0f0' },
    ];

    const mockCandidates = [
        {
            id: 'app-1',
            current_stage: 'stage-1',
            applied_at: '2023-01-01T00:00:00',
            candidate: {
                id: 'cand-1',
                first_name: 'John',
                last_name: 'Doe',
                current_position: 'Developer',
            }
        },
        {
            id: 'app-2',
            current_stage: 'stage-2',
            applied_at: '2023-01-02T00:00:00',
            candidate: {
                id: 'cand-2',
                first_name: 'Jane',
                last_name: 'Smith',
                current_position: 'Designer',
            }
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        window.mockOnDragEnd = null;
    });

    it('renders pipeline stages and candidate cards correctly', async () => {
        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    onUpdatePipeline={vi.fn()}
                    onMoveCandidate={vi.fn()}
                />
            );
        });

        // Verify stages render
        expect(screen.getByText('New Candidates')).toBeInTheDocument();
        expect(screen.getByText('Interview')).toBeInTheDocument();
        expect(screen.getByText('Hired')).toBeInTheDocument();

        // Verify candidates render
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Developer')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Designer')).toBeInTheDocument();
    });

    it('emits onMoveCandidate when a candidate card is dragged to a new stage', async () => {
        const onMoveCandidateMock = vi.fn();
        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    onUpdatePipeline={vi.fn()}
                    onMoveCandidate={onMoveCandidateMock}
                />
            );
        });

        expect(window.mockOnDragEnd).not.toBeNull();

        // Simulate dragging cand-1 from stage-1 to stage-2
        const result = {
            source: { droppableId: 'stage-1', index: 0 },
            destination: { droppableId: 'stage-2', index: 0 },
            type: 'CANDIDATE',
            draggableId: 'cand-1' // Wait, draggableId is set to app.candidate.id in JobPipeline
        };

        await act(async () => {
            window.mockOnDragEnd(result);
        });

        // Verify the callback is called
        expect(onMoveCandidateMock).toHaveBeenCalledWith('cand-1', 'stage-2');
    });

    it('triggers confetti when a candidate is moved to Hired stage', async () => {
        const onMoveCandidateMock = vi.fn();
        const { triggerConfetti } = await import('../utils/confetti');

        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    onUpdatePipeline={vi.fn()}
                    onMoveCandidate={onMoveCandidateMock}
                />
            );
        });

        const result = {
            source: { droppableId: 'stage-2', index: 0 },
            destination: { droppableId: 'stage-3', index: 0 }, // stage-3 is 'Hired'
            type: 'CANDIDATE',
            draggableId: 'cand-2'
        };

        await act(async () => {
            window.mockOnDragEnd(result);
        });

        expect(onMoveCandidateMock).toHaveBeenCalledWith('cand-2', 'stage-3');
        expect(triggerConfetti).toHaveBeenCalled();
    });
});
