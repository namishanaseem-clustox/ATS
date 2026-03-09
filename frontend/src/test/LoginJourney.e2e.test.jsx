import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import App from '../App';

describe('E2E Test: Login Journey', () => {
    afterEach(() => {
        localStorage.clear(); // Ensure clean state between tests
        window.history.pushState({}, 'Test page', '/');
    });

    it('Login success -> redirects to dashboard', async () => {
        // Setup MSW handler for successful login token request
        server.use(
            http.post('*/token', () => {
                return HttpResponse.json({
                    access_token: 'fake-jwt-token',
                    token_type: 'bearer'
                });
            })
        );

        // App wraps the whole routing and context setup
        render(<App />);

        // We expect it to redirect to the login page initially if not logged in
        expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();

        // Find inputs
        const emailInput = screen.getByLabelText(/Email address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign in/i });

        // User types credentials
        await userEvent.type(emailInput, 'admin@clustox.com');
        await userEvent.type(passwordInput, 'adminpassword123');

        // Submit form
        await userEvent.click(submitButton);

        // Wait for the app to redirect and render the Dashboard
        // Using findByText to wait for the element to appear after routing
        expect(await screen.findByText(/Welcome, Admin User/i)).toBeInTheDocument();
        expect(screen.getByText(/Here is what needs your attention today/i)).toBeInTheDocument();
    });

    it('Bad credentials -> error shown and maintains login state', async () => {
        // Setup MSW handler for failed login request
        server.use(
            http.post('*/token', () => {
                return HttpResponse.json(
                    { detail: 'Invalid credentials' },
                    { status: 401 }
                );
            })
        );

        render(<App />);

        // Verify we are on the login page
        expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();

        // Find inputs
        const emailInput = screen.getByLabelText(/Email address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign in/i });

        // User types wrong credentials
        await userEvent.type(emailInput, 'wrong@example.com');
        await userEvent.type(passwordInput, 'badpassword');

        // Submit form
        await userEvent.click(submitButton);

        // The error message from backend should show up
        expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();

        // And we should STILL be on the login screen
        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });
});
