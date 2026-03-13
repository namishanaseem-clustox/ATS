import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ScorecardTemplatesPage from '../pages/ScorecardTemplatesPage';
import * as scorecardsApi from '../api/scorecards';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../api/scorecards', () => ({
    getScorecardTemplates: vi.fn(),
    createScorecardTemplate: vi.fn(),
    updateScorecardTemplate: vi.fn(),
    deleteScorecardTemplate: vi.fn(),
}));

// Mock drag-and-drop — expose onDragEnd so we can call it directly in tests
let capturedOnDragEnd = null;
vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children, onDragEnd }) => {
        capturedOnDragEnd = onDragEnd;
        return <div>{children}</div>;
    },
    Droppable: ({ children }) => <div>{children({ innerRef: () => { }, droppableProps: {}, placeholder: null }, {})}</div>,
    Draggable: ({ children }) => <div>{children({ innerRef: () => { }, draggableProps: {}, dragHandleProps: {} }, {})}</div>,
}));

// Mock window.confirm and window.alert
const mockConfirm = vi.fn(() => true);
const mockAlert = vi.fn();
globalThis.confirm = mockConfirm;
globalThis.alert = mockAlert;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockTemplates = [
    {
        id: 1,
        name: 'Engineering Template',
        description: 'For tech roles',
        is_default: true,
        sections: [
            { label: 'Technical Skills', weight: 2 },
            { label: 'Communication', weight: 1 },
        ],
    },
    {
        id: 2,
        name: 'Sales Template',
        description: '',
        is_default: false,
        sections: [],
    },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderPage() {
    return render(
        <MemoryRouter>
            <ScorecardTemplatesPage />
        </MemoryRouter>
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScorecardTemplatesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfirm.mockReturnValue(true);
    });

    // ─── Loading state ──────────────────────────────────────────────────────────

    it('shows loading state initially', () => {
        scorecardsApi.getScorecardTemplates.mockReturnValue(new Promise(() => { }));
        renderPage();
        expect(screen.getByText('Loading templates...')).toBeInTheDocument();
    });

    // ─── Empty state ────────────────────────────────────────────────────────────

    it('shows empty state when no templates exist', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('No templates yet')).toBeInTheDocument();
        });
    });

    it('shows "Create First Template" button in empty state', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Create First Template/i })).toBeInTheDocument();
        });
    });

    // ─── Templates list ─────────────────────────────────────────────────────────

    it('renders template cards when templates exist', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Engineering Template')).toBeInTheDocument();
            expect(screen.getByText('Sales Template')).toBeInTheDocument();
        });
    });

    it('shows description when present', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('For tech roles')).toBeInTheDocument();
        });
    });

    it('shows Default badge for default template', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Default')).toBeInTheDocument();
        });
    });

    it('shows correct criteria count', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('2 criteria')).toBeInTheDocument();
            expect(screen.getByText('0 criteria')).toBeInTheDocument();
        });
    });

    // ─── fetchTemplates error ───────────────────────────────────────────────────

    it('handles fetch error gracefully (does not crash)', async () => {
        scorecardsApi.getScorecardTemplates.mockRejectedValue(new Error('Network error'));
        renderPage();
        await waitFor(() => {
            expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument();
        });
    });

    // ─── TemplateCard: expand/collapse ─────────────────────────────────────────

    it('expands and collapses template sections on chevron click', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        renderPage();
        await waitFor(() => screen.getByText('Engineering Template'));

        // Sections not visible initially
        expect(screen.queryByText('Technical Skills')).not.toBeInTheDocument();

        // Click expand (ChevronDown button) for first card
        const chevronButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-gray-400')
        );
        fireEvent.click(chevronButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Technical Skills')).toBeInTheDocument();
        });

        // Click again to collapse
        fireEvent.click(chevronButtons[0]);
        await waitFor(() => {
            expect(screen.queryByText('Technical Skills')).not.toBeInTheDocument();
        });
    });

    // ─── New Template modal ─────────────────────────────────────────────────────

    it('opens modal with "New Scorecard Template" title when New Template is clicked', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
        expect(screen.getByText('New Scorecard Template')).toBeInTheDocument();
    });

    it('opens modal from "Create First Template" button in empty state', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /Create First Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /Create First Template/i }));
        expect(screen.getByText('New Scorecard Template')).toBeInTheDocument();
    });

    it('closes modal when Cancel is clicked', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
        expect(screen.getByText('New Scorecard Template')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByText('New Scorecard Template')).not.toBeInTheDocument();
    });

    it('closes modal when backdrop is clicked', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
        const backdrop = document.querySelector('.fixed.inset-0.bg-gray-500');
        fireEvent.click(backdrop);
        expect(screen.queryByText('New Scorecard Template')).not.toBeInTheDocument();
    });

    it('closes modal when X button is clicked', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
        // X button is inside the modal header
        const modal = screen.getByText('New Scorecard Template').closest('.relative');
        const xButton = within(modal).getAllByRole('button').find(b => b.querySelector('svg'));
        fireEvent.click(xButton);
        expect(screen.queryByText('New Scorecard Template')).not.toBeInTheDocument();
    });

    // ─── Create template ────────────────────────────────────────────────────────

    it('shows alert when saving without a name', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /Create Template/i }));
        expect(mockAlert).toHaveBeenCalledWith('Template name is required');
    });

    it('creates a new template successfully', async () => {
        scorecardsApi.getScorecardTemplates
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: 3, name: 'New Template', is_default: false, sections: [] }]);
        scorecardsApi.createScorecardTemplate.mockResolvedValue({ id: 3 });

        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));

        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

        fireEvent.change(screen.getByPlaceholderText('e.g. Engineering Interview'), {
            target: { value: 'New Template' },
        });
        fireEvent.change(screen.getByPlaceholderText('e.g. Used for technical roles'), {
            target: { value: 'A description' },
        });
        fireEvent.click(screen.getByLabelText('Set as default template'));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Create Template/i }));
        });

        await waitFor(() => {
            expect(scorecardsApi.createScorecardTemplate).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'New Template', description: 'A description', is_default: true })
            );
        });
        expect(screen.queryByText('New Scorecard Template')).not.toBeInTheDocument();
    });

    it('shows alert when create API fails', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        scorecardsApi.createScorecardTemplate.mockRejectedValue(new Error('fail'));

        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
        fireEvent.change(screen.getByPlaceholderText('e.g. Engineering Interview'), {
            target: { value: 'Fail Template' },
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Create Template/i }));
        });

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Failed to save template');
        });
    });

    // ─── Edit template ──────────────────────────────────────────────────────────

    it('opens modal with "Edit Template" title and prefilled values when edit is clicked', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        renderPage();
        await waitFor(() => screen.getByText('Engineering Template'));

        // Click edit button (blue pencil) for first card
        const editButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-blue-500')
        );
        fireEvent.click(editButtons[0]);

        expect(screen.getByText('Edit Template')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Engineering Template')).toBeInTheDocument();
        expect(screen.getByDisplayValue('For tech roles')).toBeInTheDocument();
    });

    it('updates a template successfully', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        scorecardsApi.updateScorecardTemplate.mockResolvedValue({});

        renderPage();
        await waitFor(() => screen.getByText('Engineering Template'));

        const editButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-blue-500')
        );
        fireEvent.click(editButtons[0]);

        fireEvent.change(screen.getByDisplayValue('Engineering Template'), {
            target: { value: 'Updated Template' },
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Update Template/i }));
        });

        await waitFor(() => {
            expect(scorecardsApi.updateScorecardTemplate).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ name: 'Updated Template' })
            );
        });
    });

    // ─── Delete template ────────────────────────────────────────────────────────

    it('deletes a template when confirmed', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        scorecardsApi.deleteScorecardTemplate.mockResolvedValue({});
        mockConfirm.mockReturnValue(true);

        renderPage();
        await waitFor(() => screen.getByText('Engineering Template'));

        const deleteButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-red-4')
        );
        await act(async () => {
            fireEvent.click(deleteButtons[0]);
        });

        expect(scorecardsApi.deleteScorecardTemplate).toHaveBeenCalledWith(1);
    });

    it('does not delete when confirm is cancelled', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        mockConfirm.mockReturnValue(false);

        renderPage();
        await waitFor(() => screen.getByText('Engineering Template'));

        const deleteButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-red-4')
        );
        fireEvent.click(deleteButtons[0]);

        expect(scorecardsApi.deleteScorecardTemplate).not.toHaveBeenCalled();
    });

    it('shows alert when delete API fails', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue(mockTemplates);
        scorecardsApi.deleteScorecardTemplate.mockRejectedValue(new Error('fail'));
        mockConfirm.mockReturnValue(true);

        renderPage();
        await waitFor(() => screen.getByText('Engineering Template'));

        const deleteButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-red-4')
        );
        await act(async () => {
            fireEvent.click(deleteButtons[0]);
        });

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Failed to delete template');
        });
    });

    // ─── SectionEditor ──────────────────────────────────────────────────────────

    it('adds a new criterion in the section editor', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

        const initialInputs = screen.getAllByPlaceholderText('Criterion label...');
        fireEvent.click(screen.getByRole('button', { name: /Add Criterion/i }));

        await waitFor(() => {
            expect(screen.getAllByPlaceholderText('Criterion label...')).toHaveLength(initialInputs.length + 1);
        });
    });

    it('removes a criterion in the section editor', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

        const initialInputs = screen.getAllByPlaceholderText('Criterion label...');
        // Click X on first criterion (remove buttons inside section editor)
        const removeButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-red-4')
        );
        fireEvent.click(removeButtons[0]);

        await waitFor(() => {
            expect(screen.getAllByPlaceholderText('Criterion label...')).toHaveLength(initialInputs.length - 1);
        });
    });

    it('updates criterion label in the section editor', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

        const labelInput = screen.getAllByPlaceholderText('Criterion label...')[0];
        fireEvent.change(labelInput, { target: { value: 'Updated Label' } });
        expect(labelInput.value).toBe('Updated Label');
    });

    it('updates criterion weight in the section editor', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

        const weightInputs = screen.getAllByRole('spinbutton');
        fireEvent.change(weightInputs[0], { target: { value: '3' } });
        expect(weightInputs[0].value).toBe('3');
    });

    it('handles invalid weight input gracefully (defaults to 1)', async () => {
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

        const weightInputs = screen.getAllByRole('spinbutton');
        fireEvent.change(weightInputs[0], { target: { value: '' } });
        expect(weightInputs[0].value).toBe('1');
    });
});

// ─── Bonus: handleDragEnd coverage (lines 28-34) ─────────────────────────────
describe('SectionEditor handleDragEnd', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        scorecardsApi.getScorecardTemplates.mockResolvedValue([]);
    });

    async function openModal() {
        renderPage();
        await waitFor(() => screen.getByRole('button', { name: /New Template/i }));
        fireEvent.click(screen.getByRole('button', { name: /New Template/i }));
    }

    it('does nothing when drag has no destination (early return branch)', async () => {
        await openModal();
        const labelsBefore = screen.getAllByPlaceholderText('Criterion label...').map(i => i.value);
        act(() => { capturedOnDragEnd({ source: { index: 0 }, destination: null }); });
        const labelsAfter = screen.getAllByPlaceholderText('Criterion label...').map(i => i.value);
        expect(labelsAfter).toEqual(labelsBefore);
    });

    it('reorders sections when drag has a valid destination', async () => {
        await openModal();
        const labelsBefore = screen.getAllByPlaceholderText('Criterion label...').map(i => i.value);
        act(() => { capturedOnDragEnd({ source: { index: 0 }, destination: { index: 1 } }); });
        const labelsAfter = screen.getAllByPlaceholderText('Criterion label...').map(i => i.value);
        expect(labelsAfter[0]).toBe(labelsBefore[1]);
        expect(labelsAfter[1]).toBe(labelsBefore[0]);
    });
});

// ─── TemplateFormModal: || fallback branches (lines 159-161) ─────────────────
describe('TemplateFormModal useEffect fallback branches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        scorecardsApi.getScorecardTemplates.mockResolvedValue([
            { id: 99, name: 'Minimal', is_default: undefined, description: undefined, sections: undefined },
        ]);
    });

    it('falls back to empty string, false, and DEFAULT_SECTIONS when template fields are missing', async () => {
        renderPage();
        await waitFor(() => screen.getByText('Minimal'));

        const editButtons = screen.getAllByRole('button').filter(btn =>
            btn.className.includes('text-blue-500')
        );
        fireEvent.click(editButtons[0]);

        // description fallback → input should be empty string
        expect(screen.getByPlaceholderText('e.g. Used for technical roles').value).toBe('');

        // is_default fallback → checkbox unchecked
        expect(screen.getByLabelText('Set as default template').checked).toBe(false);

        // sections fallback → DEFAULT_SECTIONS rendered (4 criteria inputs)
        expect(screen.getAllByPlaceholderText('Criterion label...')).toHaveLength(4);
    });
});