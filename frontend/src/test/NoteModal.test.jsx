import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NoteModal from '../components/NoteModal';
import * as candidateApi from '../api/candidates';
import * as activityApi from '../api/activities';

vi.mock('lucide-react', () => ({
    X: () => <div data-testid="icon-x" />,
    User: () => <div data-testid="icon-user" />,
    Briefcase: () => <div data-testid="icon-briefcase" />,
    FileText: () => <div data-testid="icon-file-text" />
}));

vi.mock('../components/CustomSelect', () => ({
    default: ({ label, name, value, onChange, options, disabled }) => (
        <div data-testid={`custom-select-${name || 'note-type'}`}>
            <label>{label}</label>
            <select
                name={name}
                value={value || ''}
                disabled={disabled}
                onChange={(e) => onChange({ target: { name, value: e.target.value } })}
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    )
}));

vi.mock('../api/candidates');
vi.mock('../api/activities');

describe('NoteModal Component', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    const mockCandidates = [
        { id: 'cand1', first_name: 'John', last_name: 'Doe' }
    ];
    const mockCandidateWithApps = {
        id: 'cand1',
        first_name: 'John',
        last_name: 'Doe',
        applications: [
            { job: { id: 'job1', title: 'Software Engineer' } }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        candidateApi.getJobCandidates.mockResolvedValue([{ candidate: mockCandidates[0] }]);
        candidateApi.getCandidate.mockResolvedValue(mockCandidateWithApps);
        window.alert = vi.fn();
    });

    afterEach(() => {
        cleanup();
    });

    const renderModal = (props = {}) => render(
        <NoteModal
            isOpen={true}
            onClose={mockOnClose}
            onSave={mockOnSave}
            {...props}
        />
    );

    it('renders with initial state for new note', async () => {
        renderModal();
        expect(screen.getByRole('heading', { name: /Add Note/i })).toBeInTheDocument();
        const noteTypeSelect = screen.getByTestId('custom-select-note-type').querySelector('select');
        expect(noteTypeSelect).toHaveValue('General');
        expect(screen.getByPlaceholderText('Enter your notes here...')).toHaveValue('');
    });

    it('fetches and displays candidates when jobId is provided', async () => {
        renderModal({ jobId: 'job1' });
        await waitFor(() => expect(candidateApi.getJobCandidates).toHaveBeenCalledWith('job1'));
        const candidateSelect = screen.getByTestId('custom-select-candidate_id').querySelector('select');
        expect(candidateSelect).toHaveLength(2); // None + John Doe
    });

    it('fetches and displays jobs when candidateId is provided', async () => {
        renderModal({ candidateId: 'cand1' });
        await waitFor(() => expect(candidateApi.getCandidate).toHaveBeenCalledWith('cand1'));
        const jobSelect = screen.getByTestId('custom-select-job_id').querySelector('select');
        expect(jobSelect).toHaveLength(2); // None + Software Engineer
    });

    it('handles form input changes', async () => {
        const user = userEvent.setup();
        renderModal();

        const noteTypeSelect = screen.getByTestId('custom-select-note-type').querySelector('select');
        await user.selectOptions(noteTypeSelect, 'Interview');
        expect(noteTypeSelect).toHaveValue('Interview');

        const contentArea = screen.getByPlaceholderText('Enter your notes here...');
        await user.type(contentArea, 'This is a test note content');
        expect(contentArea).toHaveValue('This is a test note content');
    });

    it('submits correctly for Create mode', async () => {
        const user = userEvent.setup();
        activityApi.createActivity.mockResolvedValue({ id: 'new-note' });

        renderModal();
        await user.type(screen.getByPlaceholderText('Enter your notes here...'), 'Test note content');

        await user.click(screen.getByRole('button', { name: /Add Note/i }));

        await waitFor(() => {
            expect(activityApi.createActivity).toHaveBeenCalledWith(expect.objectContaining({
                activity_type: 'Note',
                description: 'Test note content',
                title: 'General Note'
            }));
        });
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('submits correctly for Update mode', async () => {
        const user = userEvent.setup();
        const existingNote = { id: 'note1', description: 'Old content', details: { note_type: 'Screening' } };
        activityApi.updateActivity.mockResolvedValue({ ...existingNote, description: 'New content' });

        renderModal({ note: existingNote });
        expect(screen.getByRole('heading', { name: /Edit Note/i })).toBeInTheDocument();

        const contentArea = screen.getByPlaceholderText('Enter your notes here...');
        await user.clear(contentArea);
        await user.type(contentArea, 'New content');

        await user.click(screen.getByRole('button', { name: /Update Note/i }));

        await waitFor(() => {
            expect(activityApi.updateActivity).toHaveBeenCalledWith('note1', expect.objectContaining({
                description: 'New content'
            }));
        });
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles validation (missing description)', async () => {
        const user = userEvent.setup();
        renderModal();

        await user.click(screen.getByRole('button', { name: /Add Note/i }));

        expect(window.alert).toHaveBeenCalledWith('Please enter note content.');
        expect(activityApi.createActivity).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
        const user = userEvent.setup();
        activityApi.createActivity.mockRejectedValue(new Error('API Error'));

        renderModal();
        await user.type(screen.getByPlaceholderText('Enter your notes here...'), 'Test content');

        await user.click(screen.getByRole('button', { name: /Add Note/i }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to save note: API Error'));
        });
    });
});
