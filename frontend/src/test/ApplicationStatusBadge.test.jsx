import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';

describe('ApplicationStatusBadge', () => {
    // ─── Renders the correct status text ─────────────────────────────────────

    it('renders the status text', () => {
        render(<ApplicationStatusBadge status="New" />);
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    // ─── Known statuses get the right colour class ────────────────────────────

    it.each([
        ['New', 'bg-blue-100', 'text-blue-800'],
        ['Shortlisted', 'bg-purple-100', 'text-purple-800'],
        ['Interview', 'bg-yellow-100', 'text-yellow-800'],
        ['Offer', 'bg-orange-100', 'text-orange-800'],
        ['Hired', 'bg-green-100', 'text-green-800'],
        ['Rejected', 'bg-red-100', 'text-red-800'],
        ['Withdrawn', 'bg-gray-100', 'text-gray-800'],
    ])('applies correct colour classes for status "%s"', (status, bgClass, textClass) => {
        render(<ApplicationStatusBadge status={status} />);
        const badge = screen.getByText(status);
        expect(badge).toHaveClass(bgClass);
        expect(badge).toHaveClass(textClass);
    });

    // ─── Unknown status falls back to neutral grey ────────────────────────────

    it('falls back to grey classes for an unknown status', () => {
        render(<ApplicationStatusBadge status="SomeRandomStatus" />);
        const badge = screen.getByText('SomeRandomStatus');
        expect(badge).toHaveClass('bg-gray-100');
        expect(badge).toHaveClass('text-gray-800');
    });

    // ─── Always renders as an inline element with base Tailwind classes ────────

    it('is an inline-flex span with pill styling', () => {
        render(<ApplicationStatusBadge status="Hired" />);
        const badge = screen.getByText('Hired');
        expect(badge.tagName).toBe('SPAN');
        expect(badge).toHaveClass('inline-flex');
        expect(badge).toHaveClass('rounded-full');
        expect(badge).toHaveClass('text-xs');
        expect(badge).toHaveClass('font-medium');
    });

    // ─── Renders gracefully with no prop passed ───────────────────────────────

    it('renders without crashing when no status prop is provided', () => {
        render(<ApplicationStatusBadge />);
        // Nothing is displayed in the badge text, but no error is thrown
        const span = document.querySelector('span');
        expect(span).toBeInTheDocument();
        // Falls back to grey since undefined is not a known status key
        expect(span).toHaveClass('bg-gray-100');
    });
});
