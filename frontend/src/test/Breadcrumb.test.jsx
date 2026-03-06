import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderBreadcrumb(items = []) {
    return render(
        <MemoryRouter>
            <Breadcrumb items={items} />
        </MemoryRouter>
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Breadcrumb', () => {
    // ─── Structure ─────────────────────────────────────────────────────────────

    it('renders a nav element with the aria-label "Breadcrumb"', () => {
        renderBreadcrumb();
        expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    });

    it('always renders the Home icon link pointing to /dashboard', () => {
        renderBreadcrumb();
        const homeLink = screen.getByRole('link', { name: '' }); // Home icon has no text
        expect(homeLink).toHaveAttribute('href', '/dashboard');
    });

    it('renders nothing extra when items array is empty', () => {
        renderBreadcrumb([]);
        // Only the Home link should exist — no additional link text
        expect(screen.queryAllByRole('link')).toHaveLength(1);
    });

    // ─── Items with `to` → rendered as links ────────────────────────────────────

    it('renders items with a `to` prop as clickable links', () => {
        renderBreadcrumb([{ label: 'Jobs', to: '/jobs' }]);
        const link = screen.getByRole('link', { name: 'Jobs' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/jobs');
    });

    it('renders multiple linked items with correct hrefs', () => {
        renderBreadcrumb([
            { label: 'Jobs', to: '/jobs' },
            { label: 'Senior Engineer', to: '/jobs/1' },
        ]);
        expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs');
        expect(screen.getByRole('link', { name: 'Senior Engineer' })).toHaveAttribute('href', '/jobs/1');
    });

    // ─── Items without `to` → rendered as plain text ────────────────────────────

    it('renders the last item without a `to` prop as a plain span (not a link)', () => {
        renderBreadcrumb([{ label: 'Current Page' }]);
        expect(screen.queryByRole('link', { name: 'Current Page' })).not.toBeInTheDocument();
        expect(screen.getByText('Current Page').tagName).toBe('SPAN');
    });

    it('renders a mix of linked and plain items correctly', () => {
        renderBreadcrumb([
            { label: 'Jobs', to: '/jobs' },
            { label: 'Senior Engineer' }, // last item — no link
        ]);
        expect(screen.getByRole('link', { name: 'Jobs' })).toBeInTheDocument();
        expect(screen.getByText('Senior Engineer').tagName).toBe('SPAN');
    });

    // ─── Labels ─────────────────────────────────────────────────────────────────

    it('renders the label text for each item', () => {
        renderBreadcrumb([
            { label: 'Departments', to: '/departments' },
            { label: 'Engineering' },
        ]);
        expect(screen.getByText('Departments')).toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
    });
});
