import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CustomSelect from '../components/CustomSelect';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOptions = [
    { value: 'hr', label: 'Human Resources' },
    { value: 'eng', label: 'Engineering' },
    { value: 'sales', label: 'Sales' },
];

function renderSelect(overrides = {}, options = mockOptions) {
    const onChange = vi.fn();
    return {
        onChange,
        ...render(
            <CustomSelect
                label="Department"
                name="department"
                options={options}
                value=""
                onChange={onChange}
                {...overrides}
            />
        )
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CustomSelect', () => {
    it('renders the label and placeholder initially', () => {
        renderSelect();
        expect(screen.getByText('Department')).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveTextContent('Select...');
    });

    it('renders the selected option label when a value is provided', () => {
        renderSelect({ value: 'eng' });
        expect(screen.getByRole('button')).toHaveTextContent('Engineering');
    });

    it('keeps the dropdown hidden by default', () => {
        renderSelect();
        expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();
    });

    it('opens the dropdown when the trigger button is clicked', () => {
        renderSelect();
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Human Resources')).toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Sales')).toBeInTheDocument();
    });

    it('closes the dropdown when clicking outside', () => {
        renderSelect();

        // Open
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Engineering')).toBeInTheDocument();

        // Click outside (mousedown)
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    });

    it('calls onChange and closes dropdown when an option is selected', () => {
        const { onChange } = renderSelect();

        // Open
        fireEvent.click(screen.getByRole('button'));

        // Click an option (Engineering)
        // Since mousedown is used in CustomSelect instead of click, we use fireEvent.mouseDown
        fireEvent.mouseDown(screen.getByText('Engineering'));

        expect(onChange).toHaveBeenCalledTimes(1);
        // The event object passed to onChange has a target with name and value
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({ name: 'department', value: 'eng' })
            })
        );

        // Dropdown should be closed
        expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    });

    it('is disabled when disabled prop is true and clicking does not open dropdown', () => {
        renderSelect({ disabled: true });

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();

        fireEvent.click(button);
        expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    });

    it('renders the Check icon next to the currently selected option', () => {
        renderSelect({ value: 'eng' });
        fireEvent.click(screen.getByRole('button'));

        // The selected option block has a Check icon (we can use the container class specific to the selected item)
        // The option div has 'bg-green-50' class when selected.
        // We need to differentiate the trigger button text from the dropdown list item text
        const engineeringOptionText = screen.getAllByText('Engineering').find(el => el.closest('.cursor-pointer'));
        const parentDiv = engineeringOptionText.closest('div');
        expect(parentDiv).toHaveClass('bg-green-50', 'text-[#00C853]');
    });

    it('renders a hidden input for HTML5 validation', () => {
        renderSelect({ required: true, value: 'sales' });
        // It's hidden but exists
        const hiddenInput = document.querySelector('input[name="department"]');
        expect(hiddenInput).toBeInTheDocument();
        expect(hiddenInput.required).toBe(true);
        expect(hiddenInput.value).toBe('sales');
    });
});
