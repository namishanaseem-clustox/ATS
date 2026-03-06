import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ActionMenu from '../components/ActionMenu';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockActions = [
    { label: 'Edit', onClick: vi.fn(), icon: <span>✏️</span> },
    { label: 'Delete', onClick: vi.fn(), className: 'text-red-600' },
];

beforeEach(() => {
    mockActions[0].onClick.mockClear();
    mockActions[1].onClick.mockClear();
});

function renderMenu(actions = mockActions) {
    return render(<ActionMenu actions={actions} />);
}

function openMenu() {
    fireEvent.click(screen.getByTestId('action-menu-trigger'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActionMenu', () => {
    it('renders a trigger button', () => {
        renderMenu();
        expect(screen.getByTestId('action-menu-trigger')).toBeInTheDocument();
    });

    it('keeps the menu items hidden by default', () => {
        renderMenu();
        // No menuitem roles should be present when closed
        expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    });

    it('opens the menu and shows action items when trigger is clicked', () => {
        renderMenu();
        openMenu();

        const items = screen.getAllByRole('menuitem');
        expect(items).toHaveLength(2);
        // Check text content instead of accessible name (to handle icon+text combos)
        expect(items[0].textContent).toContain('Edit');
        expect(items[1].textContent).toContain('Delete');
    });

    it('closes the menu when clicking outside (mousedown on document)', () => {
        renderMenu();

        // Open
        openMenu();
        expect(screen.getAllByRole('menuitem')).toHaveLength(2);

        // Click outside
        fireEvent.mouseDown(document.body);
        expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    });

    it('closes the menu when clicking the trigger button again', () => {
        renderMenu();
        const trigger = screen.getByTestId('action-menu-trigger');

        // Open
        fireEvent.click(trigger);
        expect(screen.getAllByRole('menuitem')).toHaveLength(2);

        // Toggle close
        fireEvent.click(trigger);
        expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    });

    it('calls the onClick handler and closes the menu when an action is selected', () => {
        renderMenu();
        openMenu();

        // Click the first menuitem (Edit)
        const items = screen.getAllByRole('menuitem');
        fireEvent.click(items[0]);

        expect(mockActions[0].onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    });

    it('applies custom classNames passed in the action object', () => {
        renderMenu();
        openMenu();

        const items = screen.getAllByRole('menuitem');
        // Second item (Delete) should have the custom class
        expect(items[1]).toHaveClass('text-red-600');
    });

    it('renders icons when provided in the action object', () => {
        renderMenu();
        openMenu();

        const items = screen.getAllByRole('menuitem');
        // First item (Edit) should contain the icon HTML
        expect(items[0]).toContainHTML('✏️');
    });
});
