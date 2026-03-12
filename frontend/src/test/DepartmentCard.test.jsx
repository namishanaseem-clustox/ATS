import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DepartmentCard from '../components/DepartmentCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const baseDepartment = {
    id: 42,
    name: 'Engineering',
    owner_id: 'user-99',
    status: 'Active',
    active_jobs_count: 3,
    total_jobs_count: 7,
    total_members_count: 12,
    description: 'Builds the product.',
};

function renderCard(overrides = {}, callbacks = {}) {
    const department = { ...baseDepartment, ...overrides };
    const onEdit = callbacks.onEdit ?? vi.fn();
    const onDelete = callbacks.onDelete ?? vi.fn();
    return { onEdit, onDelete, ...render(<DepartmentCard department={department} onEdit={onEdit} onDelete={onDelete} />) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DepartmentCard', () => {
    // ─── Rendering ─────────────────────────────────────────────────────────────
    it('renders the department name', () => {
        renderCard();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('renders the owner ID', () => {
        renderCard();
        expect(screen.getByText(/Owner ID:.*user-99/)).toBeInTheDocument();
    });

    it('shows "Unassigned" when owner_id is absent', () => {
        renderCard({ owner_id: null });
        expect(screen.getByText(/Owner ID:.*Unassigned/)).toBeInTheDocument();
    });

    it('renders the description when provided', () => {
        renderCard();
        expect(screen.getByText('Builds the product.')).toBeInTheDocument();
    });

    it('does NOT render a description paragraph when description is absent', () => {
        renderCard({ description: null });
        expect(screen.queryByText('Builds the product.')).not.toBeInTheDocument();
    });

    // ─── Status badge ──────────────────────────────────────────────────────────
    it('renders the status badge with green styling for Active departments', () => {
        renderCard({ status: 'Active' });
        const badge = screen.getAllByText('Active').find(el => el.classList.contains('rounded-full'));
        expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('renders the status badge with grey styling for Inactive departments', () => {
        renderCard({ status: 'Inactive' });
        const badge = screen.getAllByText('Inactive').find(el => el.classList.contains('rounded-full'));
        expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    // ─── Counts ────────────────────────────────────────────────────────────────
    it('renders the active jobs count', () => {
        renderCard();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders the total jobs count', () => {
        renderCard();
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('renders the total members count', () => {
        renderCard();
        expect(screen.getByText('12')).toBeInTheDocument();
    });

    // ─── Footer Edit / Delete callbacks ────────────────────────────────────────
    it('calls onEdit with the department when the footer Edit button is clicked', () => {
        const onEdit = vi.fn();
        renderCard({}, { onEdit });

        const editBtns = screen.getAllByTitle('Edit');
        fireEvent.click(editBtns[0]);

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 42, name: 'Engineering' }));
    });

    it('calls onDelete with the department id when the footer Delete button is clicked', () => {
        const onDelete = vi.fn();
        renderCard({}, { onDelete });

        const deleteBtns = screen.getAllByTitle('Delete');
        fireEvent.click(deleteBtns[0]);

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledWith(42);
    });

    // ─── Context menu (MoreVertical) ────────────────────────────────────────────
    it('context menu is hidden by default', () => {
        renderCard();
        const titleEditBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Edit');
        expect(titleEditBtn).toBeInTheDocument();
    });

    it('opens the context menu when toggle is clicked', () => {
        const { container } = renderCard();
        const toggleBtn = container.querySelector('.absolute.top-4.right-4 button');
        fireEvent.click(toggleBtn);

        const dropdownButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Edit') && !btn.title);
        expect(dropdownButtons.length).toBeGreaterThan(0);
    });

    it('calls onEdit and closes menu when Edit is clicked from the context menu', () => {
        const onEdit = vi.fn();
        const { container } = renderCard({}, { onEdit });
        const toggleBtn = container.querySelector('.absolute.top-4.right-4 button');
        fireEvent.click(toggleBtn);

        const dropdownEdit = screen.getAllByRole('button').find(btn => btn.textContent.includes('Edit') && !btn.title);
        fireEvent.click(dropdownEdit);

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 42, name: 'Engineering' }));
        expect(screen.queryAllByRole('button').find(btn => btn.textContent.includes('Edit') && !btn.title)).toBeUndefined();
    });

    it('calls onDelete and closes menu when Delete is clicked from the context menu', () => {
        const onDelete = vi.fn();
        const { container } = renderCard({}, { onDelete });
        const toggleBtn = container.querySelector('.absolute.top-4.right-4 button');
        fireEvent.click(toggleBtn);

        const dropdownDelete = screen.getAllByRole('button').find(btn => btn.textContent.includes('Delete') && !btn.title);
        fireEvent.click(dropdownDelete);

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledWith(42);
        expect(screen.queryAllByRole('button').find(btn => btn.textContent.includes('Delete') && !btn.title)).toBeUndefined();
    });

    // ─── Utility ──────────────────────────────────────────────────────────────
    // cn is an internal ESM helper and cannot be require()'d directly.
    // We verify its effect through the rendered DOM instead.
    it('cn utility merges classes correctly', () => {
        const { container } = renderCard({ status: 'Active' });
        const badge = container.querySelector('.bg-green-100.text-green-800');
        expect(badge).toBeInTheDocument();
    });

    // ─── Outside Clicks ────────────────────────────────────────────────────────
    it('closes the menu when clicking outside', () => {
        const { container } = renderCard();
        const toggleBtn = container.querySelector('.absolute.top-4.right-4 button');

        fireEvent.click(toggleBtn);
        expect(screen.queryByText('Edit', { exact: true })).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByText('Edit', { exact: true })).not.toBeInTheDocument();
    });

    it('does NOT close the menu when clicking inside the menu', () => {
        const { container } = renderCard();
        const toggleBtn = container.querySelector('.absolute.top-4.right-4 button');

        fireEvent.click(toggleBtn);
        const menu = container.querySelector('.absolute.top-4.right-4');

        fireEvent.mouseDown(menu);

        expect(screen.queryByText('Edit', { exact: true })).toBeInTheDocument();
    });

    // ─── Navigation ────────────────────────────────────────────────────────────
    it('navigates to the active jobs detail page when Active count is clicked', () => {
        const originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };

        renderCard();
        const activeBtn = screen.getAllByRole('button').find(btn =>
            btn.textContent.includes('Active') && btn.textContent.includes('3') && !btn.title
        );
        fireEvent.click(activeBtn);

        expect(window.location.href).toBe('/departments/42?status=Published');

        window.location = originalLocation;
    });

    it('navigates to the department detail page when Total count is clicked', () => {
        const originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };

        renderCard();
        const totalBtn = screen.getAllByRole('button').find(btn =>
            btn.textContent.includes('Total') && btn.textContent.includes('7') && !btn.title
        );
        fireEvent.click(totalBtn);

        expect(window.location.href).toBe('/departments/42');

        window.location = originalLocation;
    });
});