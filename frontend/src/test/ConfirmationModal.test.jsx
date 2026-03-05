import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from '../components/ConfirmationModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderModal(props = {}) {
    const defaults = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
    };
    return render(<ConfirmationModal {...defaults} {...props} />);
}

// ─── Visibility ───────────────────────────────────────────────────────────────

describe('ConfirmationModal', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = renderModal({ isOpen: false });
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the modal when isOpen is true', () => {
        renderModal();
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    // ─── Content ─────────────────────────────────────────────────────────────────

    it('displays the title and message passed as props', () => {
        renderModal({ title: 'Delete Department', message: 'This cannot be undone.' });
        expect(screen.getByText('Delete Department')).toBeInTheDocument();
        expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    });

    it('shows "Delete" as the default confirm button text', () => {
        renderModal();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('shows custom confirmText when provided', () => {
        renderModal({ confirmText: 'Archive' });
        expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('always renders and labels a Cancel button', () => {
        renderModal();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    // ─── Callbacks ───────────────────────────────────────────────────────────────

    it('calls onClose when the Cancel button is clicked', async () => {
        const onClose = vi.fn();
        renderModal({ onClose });
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
        const onConfirm = vi.fn();
        renderModal({ onConfirm });
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when clicking Cancel', async () => {
        const onConfirm = vi.fn();
        renderModal({ onConfirm });
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('does not call onClose when clicking the confirm button', async () => {
        const onClose = vi.fn();
        renderModal({ onClose });
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onClose).not.toHaveBeenCalled();
    });

    // ─── Confirm button styles ────────────────────────────────────────────────────

    it('uses red (danger) style for the confirm button by default', () => {
        renderModal();
        const confirmBtn = screen.getByRole('button', { name: 'Delete' });
        expect(confirmBtn).toHaveClass('bg-red-600');
    });

    it('uses primary style for the confirm button when confirmStyle is not "danger"', () => {
        renderModal({ confirmStyle: 'primary' });
        const confirmBtn = screen.getByRole('button', { name: 'Delete' });
        expect(confirmBtn).toHaveClass('bg-primary');
    });
});
