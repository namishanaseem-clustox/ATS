import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import App from '../App';

describe('E2E Test: Submit Feedback', () => {
    let mockActivities;
    let putRequestBody;

    beforeEach(() => {
        localStorage.clear();
        window.history.pushState({}, 'Test page', '/');
        putRequestBody = null;
        mockActivities = [
            {
                id: 'act-999',
                title: 'Technical Interview',
                activity_type: 'Interview',
                status: 'Pending',
                scheduled_at: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                candidate: { first_name: 'John', last_name: 'Doe' },
                candidate_id: 'cand-1',
                job_id: null,
                interviewer_id: 'int-1',
                assignees: [],
                location: '',
                participants: '',
                description: '',
                scorecard_template_id: null,
            },
        ];
    });

    afterEach(() => {
        server.resetHandlers();
    });

    it(
        'Login as Interviewer → navigate to Activities → click "View" → update status to Completed → save',
        async () => {
            const user = userEvent.setup();

            server.use(
                http.post('*/token', () => {
                    localStorage.setItem('token', 'fake-jwt');
                    return HttpResponse.json({
                        access_token: 'fake-jwt',
                        token_type: 'bearer',
                    });
                }),
                http.get('*/users/me', () =>
                    HttpResponse.json({
                        id: 'int-1',
                        email: 'interviewer@clustox.com',
                        full_name: 'Interviewer User',
                        role: 'interviewer',
                        is_active: true,
                    }),
                ),
                http.get('*/users', () => HttpResponse.json([])),

                // Reads mockActivities at call time so re-fetch after save is current
                http.get('*/activities/all/', () =>
                    HttpResponse.json(mockActivities),
                ),

                // Capture the PUT body so we can assert the status was sent correctly
                http.put('*/activities/act-999/', async ({ request }) => {
                    putRequestBody = await request.json();
                    mockActivities[0] = { ...mockActivities[0], status: putRequestBody.status };
                    return HttpResponse.json(mockActivities[0]);
                }),

                http.get('*/activities/*', () => HttpResponse.json([])),
                http.get('*/jobs*', () => HttpResponse.json([])),
                http.get('*/scorecard-templates*', () => HttpResponse.json([])),
                http.get('*/scorecards*', () => HttpResponse.json([])),
                http.get('*/candidates*', () => HttpResponse.json([])),
                http.get('*/notifications*', () => HttpResponse.json([])),
            );

            render(<App />);

            // ── STEP 1: Login ──────────────────────────────────────────────
            await waitFor(() =>
                expect(screen.getByLabelText(/email address/i)).toBeInTheDocument(),
            );

            await user.type(
                screen.getByLabelText(/email address/i),
                'interviewer@clustox.com',
            );
            await user.type(
                screen.getByLabelText(/password/i),
                'password123',
            );
            await user.click(screen.getByRole('button', { name: /sign in/i }));

            await waitFor(
                () => {
                    expect(
                        screen.queryByRole('button', { name: /sign in/i }),
                    ).not.toBeInTheDocument();
                    expect(screen.getByText('Interviewer User')).toBeInTheDocument();
                },
                { timeout: 10_000 },
            );

            // ── STEP 2: Navigate to Activities ────────────────────────────
            const activitiesLink =
                screen.queryByRole('link', { name: /activities/i }) ??
                document.querySelector('a[href="/tasks"]');

            if (!activitiesLink) throw new Error('Activities link not found in sidebar');
            await user.click(activitiesLink);

            // ── STEP 3: Wait for activity row ─────────────────────────────
            await waitFor(
                () =>
                    expect(
                        screen.getByText('Technical Interview'),
                    ).toBeInTheDocument(),
                { timeout: 15_000 },
            );

            // ── STEP 4: Click the Eye/View button ─────────────────────────
            const activityCell = screen.getByText('Technical Interview');
            const row = activityCell.closest('tr');
            if (!row) throw new Error('Could not find activity <tr> row');

            const viewButton = within(row).getByTitle('View');
            await user.click(viewButton);

            // ── STEP 5: Wait for ActivityModal to open ────────────────────
            await waitFor(
                () =>
                    expect(screen.getByText('Edit Activity')).toBeInTheDocument(),
                { timeout: 5_000 },
            );

            // ── STEP 6: Change Status to "Completed" ──────────────────────
            // CustomSelect portals its dropdown into document.body.
            // 1. Find the Status label and click its trigger button to open dropdown.
            // 2. Find the "Completed" option in the portal and click it.

            const statusLabel = screen.getByText('Status');
            const statusWrapper = statusLabel.closest('div.relative') ??
                statusLabel.parentElement.parentElement;
            const statusTriggerButton = statusWrapper.querySelector('button[type="button"]');
            if (!statusTriggerButton) throw new Error('Could not find Status dropdown trigger');

            await user.click(statusTriggerButton);

            // Wait for portal dropdown to appear and click Completed
            await waitFor(
                () => {
                    const options = [...document.body.querySelectorAll('div.cursor-pointer')];
                    const opt = options.find(el => el.textContent.trim() === 'Completed');
                    if (!opt) throw new Error('Completed option not found in portal');
                    return opt;
                },
                { timeout: 3_000 },
            );

            const completedOption = [...document.body.querySelectorAll('div.cursor-pointer')]
                .find(el => el.textContent.trim() === 'Completed');
            await user.click(completedOption);

            // Verify trigger button now shows Completed
            await waitFor(
                () => expect(statusTriggerButton.textContent).toContain('Completed'),
                { timeout: 2_000 },
            );

            // ── STEP 7: Click Save Activity ────────────────────────────────
            const saveButton = screen.getByRole('button', { name: /save activity/i });
            await user.click(saveButton);

            // ── STEP 8: Modal closes ───────────────────────────────────────
            await waitFor(
                () =>
                    expect(
                        screen.queryByText('Edit Activity'),
                    ).not.toBeInTheDocument(),
                { timeout: 5_000 },
            );

            // ── STEP 9: Assert the PUT was called with status: 'Completed' ─
            // Tasks.jsx has no status column in the table, so we verify the
            // API received the correct payload instead of checking the DOM.
            expect(putRequestBody).not.toBeNull();
            expect(putRequestBody.status).toBe('Completed');

            // ── STEP 10: Activity still visible in list after re-fetch ─────
            await waitFor(
                () =>
                    expect(
                        screen.getByText('Technical Interview'),
                    ).toBeInTheDocument(),
                { timeout: 5_000 },
            );
        },
        45_000,
    );
});