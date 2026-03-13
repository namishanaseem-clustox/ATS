import React from 'react';
import { render, screen, act, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobPipeline from '../components/JobPipeline';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
        { id: 'template-1', name: 'Default Template' },
    ])),
}));

vi.mock('../utils/confetti', () => ({
    triggerConfetti: vi.fn(),
}));

// Robust mock for all Lucide icons used in JobPipeline
vi.mock('lucide-react', () => ({
    User: () => <div data-testid="user-icon" />,
    RefreshCw: ({ className }) => <div data-testid="refresh-icon" className={className} />,
    ChevronDown: () => <div data-testid="chevron-icon" />,
    Check: () => <div data-testid="check-icon" />,
    Star: ({ className }) => <div data-testid="star-icon" className={className} />,
}));

vi.mock('../components/ScoreModal', () => ({
    default: ({ isOpen, onClose, onSave, candidateName }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="score-modal">
                <span data-testid="modal-candidate-name">{candidateName}</span>
                <button onClick={() => onSave({ technical_score: 4, communication_score: 3, recommendation: 'Yes' })}>
                    Save Score
                </button>
                <button onClick={() => onSave({ recommendation: 'Strong Yes' })}>
                    Save No Numerics
                </button>
                <button onClick={onClose}>Close</button>
            </div>
        );
    },
}));

vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children, onDragEnd }) => {
        window.mockOnDragEnd = onDragEnd;
        return <div>{children}</div>;
    },
    Droppable: ({ children }) => children(
        { droppableProps: {}, innerRef: vi.fn(), placeholder: null },
        { isDraggingOver: false }
    ),
    Draggable: ({ children }) => children(
        { draggableProps: { style: {} }, dragHandleProps: {}, innerRef: vi.fn() },
        { isDragging: false }
    ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockPipelineConfig = [
    { id: 'stage-1', name: 'New Candidates', color: '#ccc' },
    { id: 'stage-2', name: 'Interview', color: '#000' },
    { id: 'stage-3', name: 'Hired', color: '#0f0' },
];

const makeApp = (overrides = {}) => ({
    id: 'app-1',
    current_stage: 'stage-1',
    applied_at: '2023-01-01T00:00:00',
    overall_score: null,
    recommendation: null,
    score_details: null,
    candidate: {
        id: 'cand-1',
        first_name: 'John',
        last_name: 'Doe',
        current_position: 'Developer',
    },
    ...overrides,
});

function renderPipeline(props = {}) {
    return render(
        <JobPipeline
            pipelineConfig={mockPipelineConfig}
            candidates={[]}
            onUpdatePipeline={vi.fn()}
            onMoveCandidate={vi.fn()}
            {...props}
        />
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobPipeline — supplementary coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.mockOnDragEnd = null;
        window.confirm = vi.fn(() => true);
        window.alert = vi.fn();
    });

    it('places orphaned candidates (unrecognised stage) in the first stage', async () => {
        const orphan = makeApp({ id: 'app-orphan', current_stage: 'legacy-unknown-stage' });
        await act(async () => { renderPipeline({ candidates: [orphan] }); });
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('matches candidates by stage name as well as stage id', async () => {
        const byName = makeApp({ id: 'app-byname', current_stage: 'Interview' });
        await act(async () => { renderPipeline({ candidates: [byName] }); });
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows "No Title" when candidate has no current_position', async () => {
        const app = makeApp({ candidate: { id: 'c1', first_name: 'Jane', last_name: 'X', current_position: null } });
        await act(async () => { renderPipeline({ candidates: [app] }); });
        expect(screen.getByText('No Title')).toBeInTheDocument();
    });

    it('shows overall_score when present', async () => {
        const app = makeApp({ overall_score: '4.5', recommendation: 'Yes' });
        await act(async () => { renderPipeline({ candidates: [app] }); });
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });

    it('shows recommendation with green style for "Strong Yes"', async () => {
        const app = makeApp({ overall_score: '5.0', recommendation: 'Strong Yes' });
        await act(async () => { renderPipeline({ candidates: [app] }); });
        const rec = screen.getByText('Strong Yes');
        expect(rec).toHaveClass('bg-green-100');
    });

    it('shows recommendation with red style for "No"', async () => {
        const app = makeApp({ overall_score: '2.0', recommendation: 'No' });
        await act(async () => { renderPipeline({ candidates: [app] }); });
        const rec = screen.getByText('No');
        expect(rec).toHaveClass('bg-red-100');
    });

    it('shows recommendation with neutral style for "Neutral"', async () => {
        const app = makeApp({ overall_score: '3.0', recommendation: 'Neutral' });
        await act(async () => { renderPipeline({ candidates: [app] }); });
        const rec = screen.getByText('Neutral');
        expect(rec).toHaveClass('bg-gray-100');
    });

    it('does not show score section when overall_score is null', async () => {
        const app = makeApp({ overall_score: null });
        await act(async () => { renderPipeline({ candidates: [app] }); });
        expect(screen.queryByTestId('star-icon')).not.toBeInTheDocument();
    });

    it('opens ScoreModal when a candidate card is clicked', async () => {
        const app = makeApp();
        await act(async () => { renderPipeline({ candidates: [app] }); });
        const card = screen.getByText('John Doe').closest('.cursor-grab');
        fireEvent.click(card);
        expect(screen.getByTestId('score-modal')).toBeInTheDocument();
    });

    it('saves score, computes overall average, and closes modal', async () => {
        const { updateCandidateScore } = await import('../api/jobs');
        updateCandidateScore.mockResolvedValue({});
        const app = makeApp();
        await act(async () => { renderPipeline({ candidates: [app] }); });

        fireEvent.click(screen.getByText('John Doe').closest('.cursor-grab'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save Score' }));
        });

        expect(updateCandidateScore).toHaveBeenCalled();
        expect(screen.queryByTestId('score-modal')).not.toBeInTheDocument();
    });

    it('saves score with no numeric values and sets overall to 0', async () => {
        const { updateCandidateScore } = await import('../api/jobs');
        updateCandidateScore.mockResolvedValue({});
        const app = makeApp();
        await act(async () => { renderPipeline({ candidates: [app] }); });

        fireEvent.click(screen.getByText('John Doe').closest('.cursor-grab'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save No Numerics' }));
        });

        expect(updateCandidateScore).toHaveBeenCalled();
        expect(screen.queryByTestId('score-modal')).not.toBeInTheDocument();
    });

    it('shows alert when updateCandidateScore fails', async () => {
        const { updateCandidateScore } = await import('../api/jobs');
        updateCandidateScore.mockRejectedValue(new Error('fail'));
        const app = makeApp();
        await act(async () => { renderPipeline({ candidates: [app] }); });

        fireEvent.click(screen.getByText('John Doe').closest('.cursor-grab'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save Score' }));
        });

        expect(window.alert).toHaveBeenCalledWith('Failed to save score');
    });

    it('shows fallback sync error when response has no detail', async () => {
        const { syncPipelineFromTemplate } = await import('../api/jobs');
        syncPipelineFromTemplate.mockRejectedValue({});
        const userEvent = (await import('@testing-library/user-event')).default;
        const user = userEvent.setup();

        await act(async () => { renderPipeline({ pipelineTemplateId: 'template-1' }); });
        await user.click(screen.getByTitle("Update this job's pipeline from the current template stages"));

        await waitFor(() => {
            expect(screen.getByText('Sync failed')).toBeInTheDocument();
        });
    });

    it('shows fallback error when changePipelineTemplate fails without detail', async () => {
        const { changePipelineTemplate } = await import('../api/jobs');
        changePipelineTemplate.mockRejectedValue({});
        const userEvent = (await import('@testing-library/user-event')).default;
        const user = userEvent.setup();

        await act(async () => { renderPipeline({ pipelineTemplateId: 'old-template' }); });
        await user.click(screen.getByText('Default pipeline'));
        const dropdown = document.querySelector('.absolute.left-0.mt-1');
        await user.click(within(dropdown).getByText('Default Template'));

        await waitFor(() => {
            expect(screen.getByText('Failed to change template')).toBeInTheDocument();
        });
    });

    it('closes template dropdown when backdrop is clicked', async () => {
        await act(async () => { renderPipeline({}); });
        fireEvent.click(screen.getByText('Default pipeline'));
        expect(screen.getByText('Change Pipeline')).toBeInTheDocument();

        fireEvent.click(document.querySelector('.fixed.inset-0.z-10'));
        expect(screen.queryByText('Change Pipeline')).not.toBeInTheDocument();
    });

    it('updates stages when pipelineConfig prop changes', async () => {
        const { rerender } = renderPipeline({ pipelineConfig: [{ id: 's1', name: 'Stage One', color: '#aaa' }] });
        expect(screen.getByText('Stage One')).toBeInTheDocument();

        await act(async () => {
            rerender(
                <JobPipeline
                    pipelineConfig={[{ id: 's2', name: 'Stage Two', color: '#bbb' }]}
                    candidates={[]}
                    onUpdatePipeline={vi.fn()}
                    onMoveCandidate={vi.fn()}
                />
            );
        });
        expect(screen.getByText('Stage Two')).toBeInTheDocument();
    });

    it('shows sync success message that disappears after timeout', async () => {
        const { syncPipelineFromTemplate } = await import('../api/jobs');
        syncPipelineFromTemplate.mockResolvedValue({ pipeline_config: [] });

        // Setup fake timers before rendering
        vi.useFakeTimers({ shouldAdvanceTime: true });

        await act(async () => {
            renderPipeline({ pipelineTemplateId: 'template-1' });
        });

        const syncButton = screen.getByTitle("Update this job's pipeline from the current template stages");

        // Use fireEvent instead of userEvent to avoid fake-timer deadlocks
        await act(async () => {
            fireEvent.click(syncButton);
        });

        await waitFor(() => {
            expect(screen.getByText('Pipeline synced from template ✓')).toBeInTheDocument();
        });

        // Fast-forward the 3000ms setTimeout inside showMsg
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(screen.queryByText('Pipeline synced from template ✓')).not.toBeInTheDocument();
        });

        vi.useRealTimers();
    });

    // ─── ScoreModal: Close action (Line ~341) ─────────────────────────────────

    it('closes the ScoreModal when onClose is triggered', async () => {
        const app = makeApp();
        await act(async () => { renderPipeline({ candidates: [app] }); });

        // Open modal
        fireEvent.click(screen.getByText('John Doe').closest('.cursor-grab'));
        expect(screen.getByTestId('score-modal')).toBeInTheDocument();

        // Click Close
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        });

        // Modal should be gone
        expect(screen.queryByTestId('score-modal')).not.toBeInTheDocument();
    });

    // ─── Drag and Drop: handleDragEnd (Line ~122) ─────────────────────────────

    describe('Drag and Drop functionality — Branch Coverage Final', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('exhausts every logical path in handleDragEnd', async () => {
            const onUpdatePipeline = vi.fn();
            const onMoveCandidate = vi.fn();
            const { triggerConfetti } = await import('../utils/confetti');

            // Use the same IDs as the mockPipelineConfig fixture
            const STAGE_1 = 'stage-1';
            const STAGE_2 = 'stage-2';
            const STAGE_3 = 'stage-3'; // Hired

            await act(async () => {
                renderPipeline({ onUpdatePipeline, onMoveCandidate });
            });

            // 1. Path: !destination (Returns True)
            await act(async () => {
                window.mockOnDragEnd({ destination: null, source: { droppableId: STAGE_1, index: 0 } });
            });

            // 2. Path: Same Stage, Same Index (Line 122: True && True)
            await act(async () => {
                window.mockOnDragEnd({
                    source: { droppableId: STAGE_1, index: 0 },
                    destination: { droppableId: STAGE_1, index: 0 },
                    type: 'CANDIDATE'
                });
            });

            // 3. Path: Same Stage, Different Index (Line 122: True && False)
            // THIS IS THE ONE THAT GETS YOU OVER 90%
            await act(async () => {
                window.mockOnDragEnd({
                    source: { droppableId: STAGE_1, index: 0 },
                    destination: { droppableId: STAGE_1, index: 1 },
                    type: 'CANDIDATE',
                    draggableId: 'cand-1'
                });
            });

            // 4. Path: Type is STAGE (Line 125)
            await act(async () => {
                window.mockOnDragEnd({
                    source: { droppableId: 'pipeline-stages', index: 0 },
                    destination: { droppableId: 'pipeline-stages', index: 1 },
                    type: 'STAGE'
                });
            });

            // 5. Path: Move to Hired (Confetti Branch)
            await act(async () => {
                window.mockOnDragEnd({
                    source: { droppableId: STAGE_1, index: 0 },
                    destination: { droppableId: STAGE_3, index: 0 },
                    type: 'CANDIDATE',
                    draggableId: 'cand-1'
                });
            });

            // 6. Path: Move to Non-Hired Stage (Else Branch)
            await act(async () => {
                window.mockOnDragEnd({
                    source: { droppableId: STAGE_1, index: 0 },
                    destination: { droppableId: STAGE_2, index: 0 },
                    type: 'CANDIDATE',
                    draggableId: 'cand-1'
                });
            });

            expect(triggerConfetti).toHaveBeenCalled();
            expect(onMoveCandidate).toHaveBeenCalled();
        });
    });
});