import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Counter from '../components/Counter';

// ─── Setup ────────────────────────────────────────────────────────────────────
// jsdom does not implement requestAnimationFrame. We fake it so the animation
// runs synchronously: each rAF callback is called immediately with an
// ever-increasing timestamp so the easeOutQuart reaches 1.

let currentTime = 0;

beforeEach(() => {
    currentTime = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        // Advance time past the default duration (1500ms) so the counter finishes
        currentTime += 2000;
        cb(currentTime);
        return 0;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Counter', () => {
    it('starts at 0 before any animation frame runs', () => {
        // Override rAF to do nothing so we capture the initial render
        window.requestAnimationFrame.mockImplementation(() => 0);

        render(<Counter end={100} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('reaches the target end value after animation completes', () => {
        render(<Counter end={42} />);
        // After our fake rAF runs with currentTime > duration, easeOutQuart = 1
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders end=0 correctly', () => {
        render(<Counter end={0} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders large numbers correctly', () => {
        render(<Counter end={1000} />);
        expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('applies className to the span', () => {
        render(<Counter end={5} className="text-2xl font-bold" />);
        const span = screen.getByText('5');
        expect(span.tagName).toBe('SPAN');
        expect(span).toHaveClass('text-2xl');
        expect(span).toHaveClass('font-bold');
    });

    it('renders a span with no className when none is provided', () => {
        render(<Counter end={10} />);
        const span = screen.getByText('10');
        expect(span.tagName).toBe('SPAN');
        // className attribute should be absent or empty
        expect(span.className).toBeFalsy();
    });

    it('cancels the animation frame on unmount', () => {
        const { unmount } = render(<Counter end={50} />);
        unmount();
        expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
});
