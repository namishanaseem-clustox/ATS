import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PermanentDeleteModal from '../components/PermanentDeleteModal';

function renderModal(overrides = {}) {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    return {
        onClose,
        onConfirm,
        ...render(
            <PermanentDeleteModal
                isOpen={true}
                onClose={onClose}
                onConfirm={onConfirm}
                jobTitle="Senior Developer"
                loading={false}
                {...overrides}
            />
        ),
    };
}

describe('PermanentDeleteModal', () => {
    it('renders nothing when isOpen is false', () => {
        render(<PermanentDeleteModal isOpen={false} jobTitle="Dev" />);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders the modal with the job title when isOpen is true', () => {
        renderModal();
        expect(screen.getByRole('heading', { name: /Permanently Delete Job/i })).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();
        expect(screen.getAllByText('Senior Developer')[0]).toBeInTheDocument();
    });

    it('keeps the delete button disabled initially', () => {
        renderModal();
        const deleteBtn = screen.getByRole('button', { name: /Permanently Delete/i });
        expect(deleteBtn).toBeDisabled();
    });

    it('enables the delete button when the exact job title is typed', () => {
        renderModal();
        const input = screen.getByRole('textbox');
        const deleteBtn = screen.getByRole('button', { name: /Permanently Delete/i });

        fireEvent.change(input, { target: { value: 'Senior Dev' } });
        expect(deleteBtn).toBeDisabled();

        fireEvent.change(input, { target: { value: 'Senior Developer' } });
        expect(deleteBtn).not.toBeDisabled();
    });

    it('calls onConfirm when the delete button is clicked', () => {
        const { onConfirm } = renderModal();
        const input = screen.getByRole('textbox');
        const deleteBtn = screen.getByRole('button', { name: /Permanently Delete/i });

        fireEvent.change(input, { target: { value: 'Senior Developer' } });
        fireEvent.click(deleteBtn);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on the button when loading is true', () => {
        renderModal({ loading: true });
        // The button text changes to "Deleting..." and it should be disabled
        const deleteBtn = screen.getByRole('button', { name: /Deleting\.\.\./i });
        expect(deleteBtn).toBeDisabled();
    });

    it('calls onClose when the Cancel button is clicked', () => {
        const { onClose } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked', () => {
        const { onClose } = renderModal();
        // The backdrop is the div with opacity-75
        const backdrop = document.querySelector('.absolute.inset-0.bg-gray-500');
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
