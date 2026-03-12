import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../pages/Admin/AdminPage';

describe('Admin Smoke Tests', () => {
    it('renders AdminPage successfully', () => {
        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );
        expect(screen.getAllByText('Administration').length).toBeGreaterThan(0);
        expect(screen.getByText('Team Management')).toBeInTheDocument();
        expect(screen.getByText('Pipeline Stages')).toBeInTheDocument();
    });
});
