import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ScoreModal from '../components/ScoreModal';
import * as scorecardApi from '../api/scorecards';

vi.mock('lucide-react', () => ({
    X: () => <div data-testid="icon-x" />,
    Star: ({ fill }) => <div data-testid="icon-star" data-fill={fill} />,
    Save: () => <div data-testid="icon-save" />,
    Loader2: ({ className }) => <div data-testid="icon-loader" className={className} />
}));

vi.mock('../components/CustomSelect', () => ({
    default: ({ label, value, onChange, options, name }) => (
        <div data-testid={`custom-select-${name || 'recommendation'}`}>
            <label>{label}</label>
            <select
                value={value || ''}
                onChange={(e) => onChange({ target: { value: e.target.value } })}
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    )
}));

vi.mock('../api/scorecards');

describe('ScoreModal Component', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    const renderModal = (props = {}) => render(
        <ScoreModal
            isOpen={true}
            onClose={mockOnClose}
            onSave={mockOnSave}
            candidateName="Jane Doe"
            {...props}
        />
    );

    it('renders correctly with default sections when no templateId is provided', async () => {
        renderModal();
        expect(screen.getByText('Score Candidate')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('Technical Skills')).toBeInTheDocument();
        expect(screen.getByText('Communication')).toBeInTheDocument();
        expect(screen.getByText('Culture Fit')).toBeInTheDocument();
        expect(screen.getByText('Problem Solving')).toBeInTheDocument();
        expect(screen.getByText('Leadership')).toBeInTheDocument();
    });

    it('fetches and renders custom sections when templateId is provided', async () => {
        const mockTemplate = {
            id: 'tpl1',
            sections: [
                { key: 'skill1', label: 'Custom Skill 1' },
                { key: 'skill2', label: 'Custom Skill 2', weight: 2 }
            ]
        };
        scorecardApi.getScorecardTemplate.mockResolvedValue(mockTemplate);

        renderModal({ templateId: 'tpl1' });

        expect(screen.getByText(/Loading scorecard.../i)).toBeInTheDocument();
        await waitFor(() => expect(scorecardApi.getScorecardTemplate).toHaveBeenCalledWith('tpl1'));

        expect(screen.getByText('Custom Skill 1')).toBeInTheDocument();
        expect(screen.getByText('Custom Skill 2')).toBeInTheDocument();
        expect(screen.getByText(/×2 weight/i)).toBeInTheDocument();
    });

    it('handles star rating clicks', async () => {
        renderModal();

        const technicalSkillsLabel = screen.getByText('Technical Skills');
        const sectionContainer = technicalSkillsLabel.closest('div');
        const stars = sectionContainer.querySelectorAll('button');

        fireEvent.click(stars[3]); // 4th star (rating 4)

        expect(screen.getByText('4/5')).toBeInTheDocument();
        const yellowStars = sectionContainer.querySelectorAll('[data-fill="currentColor"]');
        expect(yellowStars).toHaveLength(4);
    });

    it('handles recommendation change', async () => {
        const user = userEvent.setup();
        renderModal();

        const recommendationSelect = screen.getByTestId('custom-select-recommendation').querySelector('select');
        await user.selectOptions(recommendationSelect, 'Strong Yes');
        expect(recommendationSelect).toHaveValue('Strong Yes');
    });

    it('submits scores correctly', async () => {
        const user = userEvent.setup();
        mockOnSave.mockResolvedValue({});
        renderModal();

        const technicalSkillsLabel = screen.getByText('Technical Skills');
        const stars = technicalSkillsLabel.closest('div').querySelectorAll('button');
        fireEvent.click(stars[4]); // Rating 5

        const recommendationSelect = screen.getByTestId('custom-select-recommendation').querySelector('select');
        await user.selectOptions(recommendationSelect, 'Strong Yes');

        await user.click(screen.getByRole('button', { name: /Save Score/i }));

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                technical_score: 5,
                recommendation: 'Strong Yes'
            }));
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles API errors during template fetching', async () => {
        scorecardApi.getScorecardTemplate.mockRejectedValue(new Error('Fetch failed'));
        renderModal({ templateId: 'tpl1' });

        await waitFor(() => expect(scorecardApi.getScorecardTemplate).toHaveBeenCalledWith('tpl1'));
        // Falls back to default sections
        expect(screen.getByText('Technical Skills')).toBeInTheDocument();
    });

    it('initializes with initialData if provided', async () => {
        const initialData = { technical_score: 3, recommendation: 'Yes' };
        renderModal({ initialData });

        expect(screen.getByText('3/5')).toBeInTheDocument();
        const recommendationSelect = screen.getByTestId('custom-select-recommendation').querySelector('select');
        expect(recommendationSelect).toHaveValue('Yes');
    });

    it('calls onClose when X button is clicked', async () => {
        renderModal();
        const closeBtn = screen.getByTestId('icon-x').parentElement;
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
        renderModal();
        const backdrop = document.querySelector('.fixed.inset-0.bg-gray-500.opacity-75');
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
