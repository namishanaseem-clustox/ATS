import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PipelineSettingsPage from '../pages/Admin/PipelineSettingsPage';
import * as pipelineApi from '../api/pipeline';

// 1. One clean mock definition
vi.mock('../api/pipeline', () => ({
    getPipelineTemplates: vi.fn(),
    getPipelineStages: vi.fn(),
    createPipelineStage: vi.fn(),
    updatePipelineStage: vi.fn(),
    deletePipelineStage: vi.fn(),
    createPipelineTemplate: vi.fn(),
    updatePipelineTemplate: vi.fn(),
    deletePipelineTemplate: vi.fn(),
}));

describe('PipelineSettingsPage', () => {
    const mockTemplates = [{ id: 't1', name: 'Default Pipeline', is_default: true }];
    const mockStages = [
        { id: '1', name: 'Applied', order: 0, color: '#CCCCCC', is_default: false },
        { id: '2', name: 'Interview', order: 1, color: '#CCCCCC', is_default: false }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        pipelineApi.getPipelineTemplates.mockResolvedValue(mockTemplates);
        pipelineApi.getPipelineStages.mockResolvedValue(mockStages);
    });

    it('renders templates and handles adding a stage', async () => {
        // Wrap in MemoryRouter to handle Breadcrumb/Routing
        await act(async () => {
            render(
                <MemoryRouter>
                    <PipelineSettingsPage />
                </MemoryRouter>
            );
        });

        // Use the actual UI flow: Click 'Add Stage' button first
        const addButton = screen.getByRole('button', { name: /add stage/i });
        fireEvent.click(addButton);

        const input = screen.getByPlaceholderText(/stage name/i);
        fireEvent.change(input, { target: { value: 'Technical' } });

        // Mock the return of the creation
        pipelineApi.createPipelineStage.mockResolvedValue({
            id: '3', name: 'Technical', order: 2, color: '#CCCCCC'
        });

        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(pipelineApi.createPipelineStage).toHaveBeenCalled();
    });

    it('handles stage deletion', async () => {
        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        await act(async () => {
            render(
                <MemoryRouter>
                    <PipelineSettingsPage />
                </MemoryRouter>
            );
        });

        // Target the delete button specifically
        const deleteButtons = screen.getAllByRole('button', { name: /delete stage/i });
        fireEvent.click(deleteButtons[0]);

        expect(pipelineApi.deletePipelineStage).toHaveBeenCalledWith('1');
    });
});