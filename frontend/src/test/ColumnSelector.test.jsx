import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ColumnSelector from '../components/ColumnSelector';

const mockColumns = [
    { id: 'first_name', label: 'First Name', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'status', label: 'Status', required: false },
];

function renderSelector(overrides = {}) {
    const onToggle = vi.fn();
    return {
        onToggle,
        ...render(
            <ColumnSelector
                columns={mockColumns}
                visibleColumns={['first_name', 'status']}
                onToggle={onToggle}
                {...overrides}
            />
        ),
    };
}

describe('ColumnSelector', () => {
    it('renders the toggle button and keeps dropdown closed by default', () => {
        renderSelector();
        expect(screen.getByRole('button', { name: /Columns/i })).toBeInTheDocument();
        expect(screen.queryByText('Visible Columns')).not.toBeInTheDocument();
    });

    it('opens the dropdown when button is clicked', () => {
        renderSelector();
        fireEvent.click(screen.getByRole('button', { name: /Columns/i }));

        expect(screen.getByText('Visible Columns')).toBeInTheDocument();
        expect(screen.getByLabelText('First Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('closes the dropdown when clicking outside', () => {
        renderSelector();
        const btn = screen.getByRole('button', { name: /Columns/i });
        fireEvent.click(btn);
        expect(screen.getByText('Visible Columns')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Visible Columns')).not.toBeInTheDocument();
    });

    it('renders checkboxes with correct checked state based on visibleColumns prop', () => {
        renderSelector();
        fireEvent.click(screen.getByRole('button', { name: /Columns/i }));

        expect(screen.getByLabelText('First Name')).toBeChecked();
        expect(screen.getByLabelText('Status')).toBeChecked();
        expect(screen.getByLabelText('Email')).not.toBeChecked();
    });

    it('disables the checkbox if the column is required', () => {
        renderSelector();
        fireEvent.click(screen.getByRole('button', { name: /Columns/i }));

        expect(screen.getByLabelText('First Name')).toBeDisabled();
        expect(screen.getByLabelText('Email')).not.toBeDisabled();
    });

    it('calls onToggle with column id when a checkbox is clicked', () => {
        const { onToggle } = renderSelector();
        fireEvent.click(screen.getByRole('button', { name: /Columns/i }));

        fireEvent.click(screen.getByLabelText('Email'));

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith('email');
    });

});
