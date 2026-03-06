import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MultiSelect from '../components/MultiSelect';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOptions = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
];

function renderSelect(overrides = {}) {
    const onChange = vi.fn();
    return {
        onChange,
        ...render(
            <MultiSelect
                label="Skills"
                name="skills"
                options={mockOptions}
                value={[]}
                onChange={onChange}
                {...overrides}
            />
        ),
    };
}

function openDropdown() {
    fireEvent.click(screen.getByRole('button'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MultiSelect', () => {
    // ─── Rendering ─────────────────────────────────────────────────────────────
    it('renders the label and placeholder when no items are selected', () => {
        renderSelect();
        expect(screen.getByText('Skills')).toBeInTheDocument();
        expect(screen.getByText('Select...')).toBeInTheDocument();
    });

    it('renders selected items as tags inside the trigger button', () => {
        renderSelect({ value: ['react', 'vue'] });
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Vue')).toBeInTheDocument();
        // Placeholder should not be visible when items are selected
        expect(screen.queryByText('Select...')).not.toBeInTheDocument();
    });

    it('hides the dropdown options by default', () => {
        renderSelect();
        expect(screen.queryByText('Angular')).not.toBeInTheDocument();
    });

    // ─── Dropdown toggle ───────────────────────────────────────────────────────
    it('opens the dropdown when the trigger button is clicked', () => {
        renderSelect();
        openDropdown();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Vue')).toBeInTheDocument();
        expect(screen.getByText('Angular')).toBeInTheDocument();
    });

    it('closes the dropdown when clicking outside', () => {
        renderSelect();
        openDropdown();
        expect(screen.getByText('Angular')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Angular')).not.toBeInTheDocument();
    });

    // ─── Selection ─────────────────────────────────────────────────────────────
    it('calls onChange with the added value when a new option is clicked', () => {
        const { onChange } = renderSelect({ value: [] });
        openDropdown();
        fireEvent.click(screen.getByText('React'));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({ name: 'skills', value: ['react'] }),
            })
        );
    });

    it('calls onChange with the value removed when an already-selected option is clicked', () => {
        const { onChange } = renderSelect({ value: ['react', 'vue'] });
        openDropdown();

        // Click Vue to deselect it
        const allVue = screen.getAllByText('Vue');
        // The one inside the dropdown is the .cursor-pointer one
        const dropdownVue = allVue.find(el => el.closest('.cursor-pointer'));
        fireEvent.click(dropdownVue);

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({ name: 'skills', value: ['react'] }),
            })
        );
    });

    // ─── Tag removal ───────────────────────────────────────────────────────────
    it('calls onChange with the value removed when the X on a tag is clicked', () => {
        const { onChange } = renderSelect({ value: ['react', 'angular'] });

        // Each tag has an X button (SVG with X icon inside the <span> tag)
        // React tag X is first
        const xButtons = document.querySelectorAll('.ml-1.cursor-pointer');
        expect(xButtons.length).toBe(2);
        fireEvent.click(xButtons[0]); // Remove React

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({ name: 'skills', value: ['angular'] }),
            })
        );
    });

    // ─── Selected indicator ────────────────────────────────────────────────────
    it('applies green highlight to already-selected options in the dropdown', () => {
        renderSelect({ value: ['react'] });
        openDropdown();

        // There are two "React" elements now: the tag in the button and the list item
        const reactItems = screen.getAllByText('React');
        const dropdownItem = reactItems.find(el => el.closest('.cursor-pointer'));
        expect(dropdownItem.closest('.cursor-pointer')).toHaveClass('bg-green-50', 'text-[#00C853]');
    });

    // ─── Disabled state ────────────────────────────────────────────────────────
    it('does not open the dropdown when disabled is true', () => {
        renderSelect({ disabled: true });
        const btn = screen.getByRole('button');
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
        expect(screen.queryByText('Angular')).not.toBeInTheDocument();
    });
});
