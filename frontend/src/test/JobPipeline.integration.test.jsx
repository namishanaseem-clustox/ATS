import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
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

// Mock ScoreModal
vi.mock('../components/ScoreModal', () => ({
    __esModule: true,
    default: ({ isOpen, candidateName, onSave }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="mock-score-modal">
                <span data-testid="mock-score-candidate-name">{candidateName}</span>
                <button
                    data-testid="mock-score-save-button"
                    onClick={() => onSave({ rating_1: 5, recommendation: 'Strong Yes' })}
                >
                    Mock Save
                </button>
            </div>
        );
    }
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
            draggableProps: {
                'data-testid': `draggable-${draggableId}`,
                // We don't know the exact props passed, but the children spread them.
            },
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

    it('handles stage reordering', async () => {
        const onUpdatePipelineMock = vi.fn();
        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    onUpdatePipeline={onUpdatePipelineMock}
                />
            );
        });

        const result = {
            source: { droppableId: 'pipeline-stages', index: 0 },
            destination: { droppableId: 'pipeline-stages', index: 1 },
            type: 'STAGE',
            draggableId: 'stage-1'
        };

        await act(async () => {
            window.mockOnDragEnd(result);
        });

        expect(onUpdatePipelineMock).toHaveBeenCalled();
        // The first stage should now be at index 1
        expect(onUpdatePipelineMock.mock.calls[0][0][1].id).toBe('stage-1');
    });

    it('does nothing when dragging outside a droppable', async () => {
        const onUpdatePipelineMock = vi.fn();
        const onMoveCandidateMock = vi.fn();
        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    onUpdatePipeline={onUpdatePipelineMock}
                    onMoveCandidate={onMoveCandidateMock}
                />
            );
        });

        const result = {
            source: { droppableId: 'stage-1', index: 0 },
            destination: null, // Dropped outside
            type: 'CANDIDATE',
            draggableId: 'cand-1'
        };

        await act(async () => {
            window.mockOnDragEnd(result);
        });

        expect(onUpdatePipelineMock).not.toHaveBeenCalled();
        expect(onMoveCandidateMock).not.toHaveBeenCalled();
    });

    it('does nothing when dropping in the same place', async () => {
        const onUpdatePipelineMock = vi.fn();
        const onMoveCandidateMock = vi.fn();
        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    onUpdatePipeline={onUpdatePipelineMock}
                    onMoveCandidate={onMoveCandidateMock}
                />
            );
        });

        const result = {
            source: { droppableId: 'stage-1', index: 0 },
            destination: { droppableId: 'stage-1', index: 0 },
            type: 'CANDIDATE',
            draggableId: 'cand-1'
        };

        await act(async () => {
            window.mockOnDragEnd(result);
        });

        expect(onUpdatePipelineMock).not.toHaveBeenCalled();
        expect(onMoveCandidateMock).not.toHaveBeenCalled();
    });

    it('handles syncing pipeline from template successfully', async () => {
        const { syncPipelineFromTemplate } = await import('../api/jobs');
        const onUpdatePipelineMock = vi.fn();
        syncPipelineFromTemplate.mockResolvedValueOnce({
            pipeline_config: [{ id: 'new-stage', name: 'New Stage' }]
        });

        const userEvent = (await import('@testing-library/user-event')).default;
        const user = userEvent.setup();

        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    candidates={mockCandidates}
                    pipelineTemplateId="template-1"
                    onUpdatePipeline={onUpdatePipelineMock}
                />
            );
        });

        const syncButton = screen.getByTitle("Update this job's pipeline from the current template stages");
        await user.click(syncButton);

        expect(syncPipelineFromTemplate).toHaveBeenCalledWith('job-123');
        expect(onUpdatePipelineMock).toHaveBeenCalledWith([{ id: 'new-stage', name: 'New Stage' }]);
        expect(screen.getByText('Pipeline synced from template ✓')).toBeInTheDocument();
    });

    it('handles format errors during template sync', async () => {
        const { syncPipelineFromTemplate } = await import('../api/jobs');
        syncPipelineFromTemplate.mockRejectedValueOnce({
            response: { data: { detail: 'Sync error' } }
        });

        const userEvent = (await import('@testing-library/user-event')).default;
        const user = userEvent.setup();

        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    pipelineTemplateId="template-1"
                />
            );
        });

        const syncButton = screen.getByTitle("Update this job's pipeline from the current template stages");
        await user.click(syncButton);

        expect(screen.getByText('Sync error')).toBeInTheDocument();
    });

    it('handles changing pipeline templates successfully', async () => {
        const { changePipelineTemplate } = await import('../api/jobs');
        changePipelineTemplate.mockResolvedValueOnce({
            pipeline_config: [{ id: 'changed', name: 'Changed Stage' }]
        });

        // Mock window confirm to return true
        vi.spyOn(window, 'confirm').mockImplementation(() => true);

        const userEvent = (await import('@testing-library/user-event')).default;
        const user = userEvent.setup();

        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    pipelineTemplateId="old-template"
                />
            );
        });

        // Open dropdown
        const dropdownTrigger = screen.getByText('Default pipeline');
        await user.click(dropdownTrigger);

        // Click a template
        const templateOption = screen.getByText('Default Template');
        await user.click(templateOption);

        expect(window.confirm).toHaveBeenCalled();
        expect(changePipelineTemplate).toHaveBeenCalledWith('job-123', 'template-1');
        expect(screen.getByText('Pipeline template changed ✓')).toBeInTheDocument();
    });

    it('handles aborting template change', async () => {
        const { changePipelineTemplate } = await import('../api/jobs');
        vi.spyOn(window, 'confirm').mockImplementation(() => false);

        const userEvent = (await import('@testing-library/user-event')).default;
        const user = userEvent.setup();

        await act(async () => {
            render(
                <JobPipeline
                    pipelineConfig={mockPipelineConfig}
                    pipelineTemplateId="old-template"
                />
            );
        });

        const dropdownTrigger = screen.getByText('Default pipeline');
        await user.click(dropdownTrigger);

        const templateOption = screen.getByText('Default Template');
        await user.click(templateOption);

        expect(changePipelineTemplate).not.toHaveBeenCalled();
    });
});
