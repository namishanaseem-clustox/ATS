import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NoteList from '../components/NoteList';
import * as activitiesApi from '../api/activities';
import * as authContext from '../context/AuthContext';

vi.mock('../api/activities');
vi.mock('../context/AuthContext');
vi.mock('../components/NoteModal', () => ({
    default: ({ isOpen, onClose, note, jobId, candidateId, onSave }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="note-modal">
                <span>Note Modal</span>
                <span data-testid="modal-note-id">{note?.id || 'new'}</span>
                <span data-testid="modal-job-id">{jobId || 'none'}</span>
                <span data-testid="modal-candidate-id">{candidateId || 'none'}</span>
                <button onClick={onSave}>Save Note</button>
                <button onClick={onClose}>Close Modal</button>
            </div>
        );
    }
}));

describe('NoteList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authContext.useAuth.mockReturnValue({
            user: { id: 'user-1', role: 'hr' }
        });
        global.confirm = vi.fn(() => true);
    });

    const mockNotes = [
        {
            id: 'note-1',
            activity_type: 'Note',
            title: 'Note Title',
            description: '<p>First note content</p>',
            created_at: '2024-01-15T10:00:00Z',
            details: { note_type: 'General' },
            creator: {
                id: 'user-1',
                full_name: 'John Doe',
                email: 'john@example.com'
            }
        },
        {
            id: 'note-2',
            activity_type: 'Note',
            title: 'Second Note',
            description: '<p>Second note content</p>',
            created_at: '2024-01-16T10:00:00Z',
            details: { note_type: 'Important' },
            creator: {
                id: 'user-2',
                email: 'jane@example.com'
            }
        }
    ];

    it('shows loading state initially', () => {
        activitiesApi.getJobActivities.mockReturnValue(new Promise(() => { }));

        render(<NoteList jobId="job-123" />);

        expect(screen.getByText('Loading notes...')).toBeInTheDocument();
    });

    it('shows empty state when no notes exist', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('No notes yet.')).toBeInTheDocument();
        });
    });

    it('fetches notes for job when jobId is provided', async () => {
        activitiesApi.getJobActivities.mockResolvedValue(mockNotes);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledWith('job-123');
        });
    });

    it('fetches notes for candidate when candidateId is provided', async () => {
        activitiesApi.getCandidateActivities.mockResolvedValue(mockNotes);

        render(<NoteList candidateId="cand-456" />);

        await waitFor(() => {
            expect(activitiesApi.getCandidateActivities).toHaveBeenCalledWith('cand-456');
        });
    });

    it('filters out non-Note activity types', async () => {
        const mixedActivities = [
            ...mockNotes,
            { id: 'act-1', activity_type: 'Interview', created_at: '2024-01-17T10:00:00Z' },
            { id: 'act-2', activity_type: 'Call', created_at: '2024-01-18T10:00:00Z' }
        ];

        activitiesApi.getJobActivities.mockResolvedValue(mixedActivities);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/First note content/i)).toBeInTheDocument();
            expect(screen.getByText(/Second note content/i)).toBeInTheDocument();
            expect(screen.queryByText('Interview')).not.toBeInTheDocument();
        });
    });

    it('sorts notes by created_at descending (newest first)', async () => {
        const unsortedNotes = [
            { ...mockNotes[0], id: 'old', created_at: '2024-01-10T10:00:00Z' },
            { ...mockNotes[0], id: 'newest', created_at: '2024-01-20T10:00:00Z' },
            { ...mockNotes[0], id: 'middle', created_at: '2024-01-15T10:00:00Z' }
        ];

        activitiesApi.getJobActivities.mockResolvedValue(unsortedNotes);

        const { container } = render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            const noteCards = container.querySelectorAll('.bg-yellow-50');
            expect(noteCards).toHaveLength(3);
        });
    });

    it('renders notes correctly', async () => {
        activitiesApi.getJobActivities.mockResolvedValue(mockNotes);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('General')).toBeInTheDocument();
            expect(screen.getByText('Important')).toBeInTheDocument();
            expect(screen.getByText(/First note content/i)).toBeInTheDocument();
            expect(screen.getByText(/Second note content/i)).toBeInTheDocument();
        });
    });

    it('displays note type badge', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('General')).toBeInTheDocument();
        });
    });

    it('displays creator name when available', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/by John Doe/i)).toBeInTheDocument();
        });
    });

    it('displays creator email when name is not available', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[1]]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/by jane@example.com/i)).toBeInTheDocument();
        });
    });

    it('opens add note modal when Add Note button is clicked', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('No notes yet.')).toBeInTheDocument();
        });

        const addButton = screen.getByText('Add Note');
        fireEvent.click(addButton);

        expect(screen.getByTestId('note-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-note-id')).toHaveTextContent('new');
    });

    it('opens edit note modal when Edit button is clicked', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);
        });

        expect(screen.getByTestId('note-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-note-id')).toHaveTextContent('note-1');
    });

    it('deletes note when delete button is clicked and confirmed', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);
        activitiesApi.deleteActivity.mockResolvedValue({});

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/First note content/i)).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('×');
        fireEvent.click(deleteButton);

        expect(global.confirm).toHaveBeenCalledWith('Delete this note?');

        await waitFor(() => {
            expect(activitiesApi.deleteActivity).toHaveBeenCalledWith('note-1');
        });
    });

    it('does not delete note when user cancels confirmation', async () => {
        global.confirm = vi.fn(() => false);
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/First note content/i)).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('×');
        fireEvent.click(deleteButton);

        expect(global.confirm).toHaveBeenCalled();
        expect(activitiesApi.deleteActivity).not.toHaveBeenCalled();
    });

    it('handles delete error gracefully', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);
        activitiesApi.deleteActivity.mockRejectedValue(new Error('Delete failed'));

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText(/First note content/i)).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('×');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalledWith('Failed to delete note', expect.any(Error));
        });

        consoleError.mockRestore();
    });

    it('refreshes notes after save', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('No notes yet.')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add Note'));

        activitiesApi.getJobActivities.mockResolvedValue([mockNotes[0]]);

        const saveButton = screen.getByText('Save Note');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledTimes(2);
        });
    });

    it('closes modal after save', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            fireEvent.click(screen.getByText('Add Note'));
        });

        expect(screen.getByTestId('note-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Save Note'));

        await waitFor(() => {
            expect(screen.queryByTestId('note-modal')).not.toBeInTheDocument();
        });
    });

    it('shows Edit and Delete buttons only for interviewer who created the note', async () => {
        authContext.useAuth.mockReturnValue({
            user: { id: 'user-1', role: 'interviewer' }
        });

        const notes = [
            { ...mockNotes[0], creator: { id: 'user-1', full_name: 'Me' } },
            { ...mockNotes[1], creator: { id: 'user-2', full_name: 'Other' } }
        ];

        activitiesApi.getJobActivities.mockResolvedValue(notes);

        const { container } = render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            const editButtons = screen.getAllByText('Edit');
            const deleteButtons = screen.getAllByText('×');

            // Should have Edit/Delete for first note only
            expect(editButtons).toHaveLength(1);
            expect(deleteButtons).toHaveLength(1);
        });
    });

    it('shows Edit and Delete for all notes when user is not interviewer', async () => {
        authContext.useAuth.mockReturnValue({
            user: { id: 'user-3', role: 'hr' }
        });

        activitiesApi.getJobActivities.mockResolvedValue(mockNotes);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            const editButtons = screen.getAllByText('Edit');
            expect(editButtons).toHaveLength(2);
        });
    });

    it('displays candidate badge when not in candidate context', async () => {
        const noteWithCandidate = {
            ...mockNotes[0],
            candidate: { first_name: 'Jane', last_name: 'Smith' }
        };

        activitiesApi.getJobActivities.mockResolvedValue([noteWithCandidate]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('does not display candidate badge when in candidate context', async () => {
        const noteWithCandidate = {
            ...mockNotes[0],
            candidate: { first_name: 'Jane', last_name: 'Smith' }
        };

        activitiesApi.getCandidateActivities.mockResolvedValue([noteWithCandidate]);

        render(<NoteList candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        });
    });

    it('displays job badge when not in job context', async () => {
        const noteWithJob = {
            ...mockNotes[0],
            job: { title: 'Software Engineer' }
        };

        activitiesApi.getCandidateActivities.mockResolvedValue([noteWithJob]);

        render(<NoteList candidateId="cand-123" />);

        await waitFor(() => {
            expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        });
    });

    it('does not display job badge when in job context', async () => {
        const noteWithJob = {
            ...mockNotes[0],
            job: { title: 'Software Engineer' }
        };

        activitiesApi.getJobActivities.mockResolvedValue([noteWithJob]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();
        });
    });

    it('handles missing creator gracefully', async () => {
        const noteNoCreator = {
            ...mockNotes[0],
            creator: null
        };

        activitiesApi.getJobActivities.mockResolvedValue([noteNoCreator]);

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.queryByText(/by/i)).not.toBeInTheDocument();
        });
    });

    it('handles missing note_type in details', async () => {
        const noteNoType = {
            ...mockNotes[0],
            details: {}
        };

        activitiesApi.getJobActivities.mockResolvedValue([noteNoType]);

        const { container } = render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(container.querySelector('.bg-white.text-yellow-800')).toBeInTheDocument();
        });
    });

    it('passes correct props to NoteModal', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);

        render(<NoteList jobId="job-123" candidateId="cand-456" />);

        await waitFor(() => {
            fireEvent.click(screen.getByText('Add Note'));
        });

        expect(screen.getByTestId('modal-job-id')).toHaveTextContent('job-123');
        expect(screen.getByTestId('modal-candidate-id')).toHaveTextContent('cand-456');
    });

    it('handles API fetch error gracefully', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
        activitiesApi.getJobActivities.mockRejectedValue(new Error('API Error'));

        render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(screen.getByText('No notes yet.')).toBeInTheDocument();
        });

        expect(consoleError).toHaveBeenCalledWith('Failed to fetch notes', expect.any(Error));
        consoleError.mockRestore();
    });

    it('refetches notes when jobId changes', async () => {
        activitiesApi.getJobActivities.mockResolvedValue([]);

        const { rerender } = render(<NoteList jobId="job-123" />);

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledWith('job-123');
        });

        rerender(<NoteList jobId="job-456" />);

        await waitFor(() => {
            expect(activitiesApi.getJobActivities).toHaveBeenCalledWith('job-456');
        });
    });

    it('refetches notes when candidateId changes', async () => {
        activitiesApi.getCandidateActivities.mockResolvedValue([]);

        const { rerender } = render(<NoteList candidateId="cand-123" />);

        await waitFor(() => {
            expect(activitiesApi.getCandidateActivities).toHaveBeenCalledWith('cand-123');
        });

        rerender(<NoteList candidateId="cand-456" />);

        await waitFor(() => {
            expect(activitiesApi.getCandidateActivities).toHaveBeenCalledWith('cand-456');
        });
    });
});
