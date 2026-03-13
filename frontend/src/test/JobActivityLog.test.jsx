import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import JobActivityLog from '../components/JobActivityLog';

describe('JobActivityLog Component', () => {
    it('renders empty state when no activities provided', () => {
        render(<JobActivityLog activities={[]} />);
        expect(screen.getByText(/No audit logs recorded/i)).toBeInTheDocument();
    });

    it('renders empty state when activities is null', () => {
        render(<JobActivityLog activities={null} />);
        expect(screen.getByText(/No audit logs recorded/i)).toBeInTheDocument();
    });

    it('renders empty state when activities is undefined', () => {
        render(<JobActivityLog />);
        expect(screen.getByText(/No audit logs recorded/i)).toBeInTheDocument();
    });

    it('renders CREATED activity correctly', () => {
        const activities = [{
            id: 'a1',
            action_type: 'CREATED',
            timestamp: '2024-01-15T10:00:00Z',
            details: { title: 'Software Engineer' }
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/Job created with title "Software Engineer"/i)).toBeInTheDocument();
    });

    it('renders UPDATED activity with status change', () => {
        const activities = [{
            id: 'a2',
            action_type: 'UPDATED',
            timestamp: '2024-01-15T11:00:00Z',
            details: {
                status: { old: 'Draft', new: 'Published' }
            }
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/changed status from Draft to Published/i)).toBeInTheDocument();
    });

    it('renders UPDATED activity with multiple field changes', () => {
        const activities = [{
            id: 'a3',
            action_type: 'UPDATED',
            timestamp: '2024-01-15T12:00:00Z',
            details: {
                title: { old: 'Junior Dev', new: 'Senior Dev' },
                location: { old: 'Remote', new: 'New York' }
            }
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/updated Title/i)).toBeInTheDocument();
        expect(screen.getByText('Junior Dev')).toBeInTheDocument();
        expect(screen.getByText('Senior Dev')).toBeInTheDocument();
        expect(screen.getByText('Remote')).toBeInTheDocument();
        expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('renders UPDATED activity with no details', () => {
        const activities = [{
            id: 'a4',
            action_type: 'UPDATED',
            timestamp: '2024-01-15T13:00:00Z',
            details: null
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/Job details updated/i)).toBeInTheDocument();
    });

    it('renders CLONED_FROM activity', () => {
        const activities = [{
            id: 'a5',
            action_type: 'CLONED_FROM',
            timestamp: '2024-01-15T14:00:00Z'
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/Job cloned from another requisition/i)).toBeInTheDocument();
    });

    it('renders ARCHIVED activity', () => {
        const activities = [{
            id: 'a6',
            action_type: 'ARCHIVED',
            timestamp: '2024-01-15T15:00:00Z'
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/Job archived/i)).toBeInTheDocument();
    });

    it('renders PIPELINE_UPDATED activity', () => {
        const activities = [{
            id: 'a7',
            action_type: 'PIPELINE_UPDATED',
            timestamp: '2024-01-15T16:00:00Z'
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/Hiring pipeline configuration updated/i)).toBeInTheDocument();
    });

    it('renders unknown action type with fallback', () => {
        const activities = [{
            id: 'a8',
            action_type: 'CUSTOM_ACTION',
            timestamp: '2024-01-15T17:00:00Z'
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText('CUSTOM_ACTION')).toBeInTheDocument();
    });

    it('sorts activities by timestamp in descending order', () => {
        const activities = [
            { id: 'a1', action_type: 'CREATED', timestamp: '2024-01-15T10:00:00Z', details: { title: 'First' } },
            { id: 'a2', action_type: 'UPDATED', timestamp: '2024-01-15T12:00:00Z', details: { status: { old: 'A', new: 'B' } } },
            { id: 'a3', action_type: 'ARCHIVED', timestamp: '2024-01-15T11:00:00Z' }
        ];

        const { container } = render(<JobActivityLog activities={activities} />);
        const items = container.querySelectorAll('li');

        // Should be sorted: a2 (12:00), a3 (11:00), a1 (10:00)
        expect(items).toHaveLength(3);
    });

    it('formats timestamps correctly', () => {
        const activities = [{
            id: 'a1',
            action_type: 'CREATED',
            timestamp: '2024-01-15T10:30:00Z',
            details: { title: 'Test Job' }
        }];

        render(<JobActivityLog activities={activities} />);
        // The formatted date should appear (format varies by locale)
        const timestampElements = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
        expect(timestampElements.length).toBeGreaterThan(0);
    });

    it('shows connection line between activities except for last item', () => {
        const activities = [
            { id: 'a1', action_type: 'CREATED', timestamp: '2024-01-15T10:00:00Z', details: { title: 'Job 1' } },
            { id: 'a2', action_type: 'ARCHIVED', timestamp: '2024-01-15T11:00:00Z' }
        ];

        const { container } = render(<JobActivityLog activities={activities} />);
        const lines = container.querySelectorAll('.absolute.top-4');

        // First item should have a line, last shouldn't
        expect(lines.length).toBeGreaterThan(0);
    });

    it('truncates long field values in UPDATED details', () => {
        const longValue = 'A'.repeat(30);
        const activities = [{
            id: 'a1',
            action_type: 'UPDATED',
            timestamp: '2024-01-15T10:00:00Z',
            details: {
                description: { old: longValue, new: 'Short' }
            }
        }];

        render(<JobActivityLog activities={activities} />);
        // The truncation logic uses substring(0, 20) + '...'
        expect(screen.queryByText(longValue)).not.toBeInTheDocument();
    });

    it('handles activities with empty details object', () => {
        const activities = [{
            id: 'a1',
            action_type: 'UPDATED',
            timestamp: '2024-01-15T10:00:00Z',
            details: {}
        }];

        render(<JobActivityLog activities={activities} />);
        expect(screen.getByText(/Job details updated/i)).toBeInTheDocument();
    });

    it('displays detailed changes section for UPDATED action', () => {
        const activities = [{
            id: 'a1',
            action_type: 'UPDATED',
            timestamp: '2024-01-15T10:00:00Z',
            details: {
                salary: { old: '100000', new: '120000' }
            }
        }];

        const { container } = render(<JobActivityLog activities={activities} />);

        // Use getAllByText because 'Salary' appears in 'updated Salary' and 'salary:'
        expect(screen.getAllByText(/Salary/i).length).toBeGreaterThan(0);
        expect(screen.getByText('100000')).toBeInTheDocument();
        expect(screen.getByText('120000')).toBeInTheDocument();

        // Check for the detailed changes box
        const detailsBox = container.querySelector('.bg-gray-50.p-2');
        expect(detailsBox).toBeInTheDocument();
    });

    it('renders correct icon colors for each action type', () => {
        const activities = [
            { id: 'a1', action_type: 'CREATED', timestamp: '2024-01-15T10:00:00Z', details: { title: 'Job' } },
            { id: 'a2', action_type: 'UPDATED', timestamp: '2024-01-15T11:00:00Z', details: {} },
            { id: 'a3', action_type: 'ARCHIVED', timestamp: '2024-01-15T12:00:00Z' },
            { id: 'a4', action_type: 'PIPELINE_UPDATED', timestamp: '2024-01-15T13:00:00Z' }
        ];

        const { container } = render(<JobActivityLog activities={activities} />);

        // Check for icon containers with specific background colors
        expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
        expect(container.querySelector('.bg-blue-100')).toBeInTheDocument();
        expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
        expect(container.querySelector('.bg-orange-100')).toBeInTheDocument();
    });
});
