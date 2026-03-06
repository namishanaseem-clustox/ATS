import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CandidateModal from '../components/CandidateModal';

// ─── Mock heavy child dependencies ────────────────────────────────────────────

// CandidateForm calls getJobs (via JobSelector) and createCandidate/updateCandidate.
// We mock them to keep this a pure unit test of CandidateModal's own behaviour.

vi.mock('../api/jobs', () => ({
    getJobs: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/candidates', () => ({
    createCandidate: vi.fn().mockResolvedValue({ id: 'c-99' }),
    updateCandidate: vi.fn().mockResolvedValue({}),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderModal(overrides = {}) {
    const onClose = vi.fn();
    const onSave = vi.fn();
    return {
        onClose,
        onSave,
        ...render(
            <CandidateModal
                isOpen={true}
                onClose={onClose}
                onSave={onSave}
                candidate={null}
                {...overrides}
            />
        ),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CandidateModal', () => {
    // ─── Visibility ────────────────────────────────────────────────────────────
    it('renders nothing when isOpen is false', () => {
        render(
            <CandidateModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />
        );
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders the modal when isOpen is true', () => {
        renderModal();
        expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    // ─── Title ─────────────────────────────────────────────────────────────────
    it('shows "Add Candidate" title when no candidate prop is given', () => {
        renderModal({ candidate: null });
        expect(screen.getByRole('heading', { name: /Add Candidate/i })).toBeInTheDocument();
    });

    it('shows "Edit Candidate" title when a candidate prop is provided', () => {
        renderModal({
            candidate: {
                id: 'c-1',
                first_name: 'Jane',
                last_name: 'Doe',
                email: 'jane@example.com',
            },
        });
        expect(screen.getByRole('heading', { name: /Edit Candidate/i })).toBeInTheDocument();
    });

    // ─── Close controls ────────────────────────────────────────────────────────
    it('calls onClose when the X button is clicked', () => {
        const { onClose } = renderModal();
        // The X button is the only button at the top that doesn't say Cancel/Save
        const buttons = screen.getAllByRole('button');
        const xBtn = buttons.find(b => !b.textContent.includes('Cancel') && !b.textContent.includes('Save') && !b.textContent.includes('Candidate'));
        fireEvent.click(xBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop overlay is clicked', () => {
        const { onClose } = renderModal();
        // The semi-transparent backdrop div has an onClick on it
        const backdrop = document.querySelector('.absolute.inset-0.bg-gray-500');
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the Cancel button inside the form is clicked', () => {
        const { onClose } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // ─── Save flow ─────────────────────────────────────────────────────────────
    it('calls onSave and onClose after a successful form submission', async () => {
        const { onSave, onClose } = renderModal();

        // Fill in required fields — inputs lack accessible names so we use container querySelector
        fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'Alice' } });
        fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Smith' } });
        fireEvent.change(document.querySelector('input[name="email"]'), { target: { name: 'email', value: 'alice@example.com' } });

        fireEvent.click(screen.getByRole('button', { name: /Save Candidate/i }));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
