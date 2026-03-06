import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WelcomeModal from '../components/WelcomeModal';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

function renderModal() {
    return render(
        <BrowserRouter>
            <WelcomeModal />
        </BrowserRouter>
    );
}

describe('WelcomeModal', () => {
    let store = {};
    const mockLocalStorage = {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; })
    };

    beforeEach(() => {
        store = {};
        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the modal if hasSeenWelcome is outside localStorage', () => {
        renderModal();
        expect(screen.getByRole('heading', { name: /Welcome to Clustox ATS/i })).toBeInTheDocument();
        expect(screen.getByText('Your hiring command center is ready.')).toBeInTheDocument();
    });

    it('does not render if hasSeenWelcome is true in localStorage', () => {
        localStorage.setItem('hasSeenWelcome', 'true');
        renderModal();
        expect(screen.queryByRole('heading', { name: /Welcome to Clustox ATS/i })).not.toBeInTheDocument();
    });

    it('closes the modal and sets localStorage when Get Started is clicked', () => {
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));

        expect(localStorage.getItem('hasSeenWelcome')).toBe('true');
        expect(screen.queryByRole('heading', { name: /Welcome to Clustox ATS/i })).not.toBeInTheDocument();
    });

    it('closes the modal and sets localStorage when X button is clicked', () => {
        renderModal();

        // Modal has two buttons: X (close) and Get Started
        // The X button has no visible text but is an SVG. We can find it as the button without "Get Started" text
        const buttons = screen.getAllByRole('button');
        const xBtn = buttons.find(b => !b.textContent.includes('Get Started'));

        fireEvent.click(xBtn);

        expect(localStorage.getItem('hasSeenWelcome')).toBe('true');
        expect(screen.queryByRole('heading', { name: /Welcome to Clustox ATS/i })).not.toBeInTheDocument();
    });

    it('closes the modal and sets localStorage when backdrop is clicked', () => {
        renderModal();

        // Backdrop is the specific div with opacity-75 inside the fixed inset wrapper
        const backdrop = document.querySelector('.absolute.inset-0.bg-gray-500');
        fireEvent.click(backdrop);

        expect(localStorage.getItem('hasSeenWelcome')).toBe('true');
        expect(screen.queryByRole('heading', { name: /Welcome to Clustox ATS/i })).not.toBeInTheDocument();
    });
});
