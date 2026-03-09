import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Login from '../pages/Login';
import * as AuthContextObj from '../context/AuthContext';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

describe('Auth Flow Integration Test', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup useNavigate mock
        useNavigate.mockReturnValue(mockNavigate);
    });

    it('Login success -> redirects to dashboard', async () => {
        // Mock useAuth for successful login
        const mockLogin = vi.fn().mockResolvedValueOnce(true);
        AuthContextObj.useAuth.mockReturnValue({
            login: mockLogin,
            user: null, // initially no user
            sessionMessage: null,
            clearSessionMessage: vi.fn()
        });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            );
        });

        const emailInput = screen.getByLabelText(/Email address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign in/i });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
        });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify login attempt
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'ValidPassword123');

        // Verify redirect to dashboard
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('Bad credentials -> error shown and no redirect', async () => {
        // Mock useAuth for failed login (bad credentials)
        const mockErrorResponse = {
            response: {
                data: {
                    detail: 'Invalid credentials'
                }
            }
        };
        const mockLogin = vi.fn().mockRejectedValueOnce(mockErrorResponse);
        AuthContextObj.useAuth.mockReturnValue({
            login: mockLogin,
            user: null, // initially no user
            sessionMessage: null,
            clearSessionMessage: vi.fn()
        });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            );
        });

        const emailInput = screen.getByLabelText(/Email address/i);
        const passwordInput = screen.getByLabelText(/Password/i);
        const submitButton = screen.getByRole('button', { name: /Sign in/i });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'WrongPassword' } });
        });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // Verify login attempt
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'WrongPassword');

        // Verify error renders instead of redirecting
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
    });
});
