import React from 'react';
import { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import App from '../App';

vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children, onDragEnd }) => {
        window.mockOnDragEnd = onDragEnd;
        return <div data-testid="dnd-context">{children}</div>;
    },
    Droppable: ({ children, droppableId, type }) =>
        children(
            {
                droppableProps: { 'data-testid': `droppable-${type}-${droppableId}` },
                innerRef: vi.fn(),
                placeholder: null,
            },
            { isDraggingOver: false },
        ),
    Draggable: ({ children, draggableId }) =>
        children(
            {
                draggableProps: { 'data-testid': `draggable-${draggableId}` },
                dragHandleProps: {},
                innerRef: vi.fn(),
            },
            { isDragging: false },
        ),
}));

describe('E2E Test: Hire a Candidate', () => {
    let hireCount;
    let user;

    const mockUser = {
        id: 'u-owner',
        email: 'owner@clustox.com',
        full_name: 'Owner User',
        role: 'owner',
        is_active: true,
    };

    const mockJob = {
        id: 'job-123',
        title: 'Software Engineer',
        job_code: 'SE-001',
        status: 'Published',
        pipeline_config: [
            { id: 'new', name: 'New Candidates' },
            { id: 'hired', name: 'Hired' },
        ],
    };

    const mockApplication = {
        id: 'app-456',
        candidate: { id: 'cand-456', first_name: 'John', last_name: 'Doe' },
        current_stage: 'new',
        job_id: 'job-123',
    };

    beforeEach(() => {
        hireCount = 0;
        // ✅ Fresh userEvent instance per test
        user = userEvent.setup();
        localStorage.clear();
        vi.clearAllMocks();
        window.mockOnDragEnd = null;
        window.history.pushState({}, 'Test page', '/');
        server.resetHandlers();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    it(
        'Owner moves candidate to Hired stage → hire count on dashboard increments',
        async () => {
            server.use(
                // ── Auth ───────────────────────────────────────────────────
                http.post('*/token', () => {
                    localStorage.setItem('token', 'fake-jwt');
                    return HttpResponse.json({
                        access_token: 'fake-jwt',
                        token_type: 'bearer',
                    });
                }),
                http.get('*/users/me', () => HttpResponse.json(mockUser)),
                http.get('*/users', () => HttpResponse.json([mockUser])),

                // ── Dashboard endpoints ────────────────────────────────────
                // Returns live hireCount at call time (not registration time)
                http.get('*/dashboard/top-performers', () =>
                    HttpResponse.json({
                        // Only include item when count > 0 — widget shows
                        // "No users with hires found." for empty array,
                        // and renders "<count> hires" span only when items exist
                        hires: hireCount > 0
                            ? [{ id: 'u-owner', name: 'Owner User', count: hireCount }]
                            : [],
                        candidates: [],
                        jobs: [],
                        actions: [],
                    }),
                ),
                http.get('*/dashboard/overview', () =>
                    HttpResponse.json({ hires_count: hireCount }),
                ),
                http.get('*/dashboard/recent-activities', () =>
                    HttpResponse.json([]),
                ),
                http.get('*/dashboard/actions-taken', () =>
                    HttpResponse.json([]),
                ),
                // ✅ Must return an array — MyPerformanceChartWidget passes
                // this to Recharts which calls .slice() on it
                http.get('*/dashboard/my-performance', () =>
                    HttpResponse.json([]),
                ),
                http.get('*/dashboard/*', () => HttpResponse.json([])),

                // ── Jobs ───────────────────────────────────────────────────
                http.get('*/jobs', () => HttpResponse.json([mockJob])),
                http.get('*/jobs/job-123', () => HttpResponse.json(mockJob)),
                http.get('*/jobs/job-123/candidates', () =>
                    HttpResponse.json([mockApplication]),
                ),

                // ── Move Stage ─────────────────────────────────────────────
                http.put(
                    '*/jobs/job-123/candidates/cand-456/stage',
                    async ({ request }) => {
                        const body = await request.json();
                        if (body.stage === 'hired') hireCount++;
                        return HttpResponse.json({
                            ...mockApplication,
                            current_stage: body.stage,
                        });
                    },
                ),

                // ── Pipeline Templates ─────────────────────────────────────
                http.get('*/pipeline-templates*', () => HttpResponse.json([])),
                http.get('*/pipeline*', () => HttpResponse.json([])),

                // ── Fallbacks ──────────────────────────────────────────────
                http.get('*/notifications*', () => HttpResponse.json([])),
                http.get('*/activities/all/', () => HttpResponse.json([])),
                http.get('*/activities*', () => HttpResponse.json([])),
                http.get('*/scorecard*', () => HttpResponse.json([])),
                http.get('*/candidates*', () => HttpResponse.json([])),
                http.get('*/requisitions*', () => HttpResponse.json([])),
            );

            render(<App />);

            // ── STEP 1: Login ──────────────────────────────────────────────
            await waitFor(() =>
                expect(
                    screen.getByLabelText(/email address/i),
                ).toBeInTheDocument(),
            );
            await user.type(
                screen.getByLabelText(/email address/i),
                'owner@clustox.com',
            );
            await user.type(
                screen.getByLabelText(/password/i),
                'password123',
            );
            await user.click(
                screen.getByRole('button', { name: /sign in/i }),
            );

            // ── STEP 2: Wait for dashboard to load ─────────────────────────
            // Sidebar renders "Owner User" in the bottom user row
            await waitFor(
                () =>
                    expect(
                        screen.getByText(/Welcome, Owner User/i),
                    ).toBeInTheDocument(),
                { timeout: 10_000 },
            );

            // Wait for TopPerformersWidget to finish loading
            // (hireCount=0 → returns [] → renders "No users with hires found.")
            await waitFor(
                () => {
                    expect(
                        screen.queryByText('Loading...'),
                    ).not.toBeInTheDocument();
                },
                { timeout: 10_000 },
            );

            // ── STEP 3: Navigate to Jobs ───────────────────────────────────
            // Sidebar.jsx: <NavItem to="/jobs" label="Jobs" /> — visible to owner
            // Must waitFor because NavLink renders after auth state settles
            await waitFor(
                () =>
                    expect(
                        screen.getByRole('link', { name: /^jobs$/i }),
                    ).toBeInTheDocument(),
                { timeout: 5_000 },
            );
            await user.click(screen.getByRole('link', { name: /^jobs$/i }));

            // ── STEP 4: Click the job card/row ────────────────────────────
            await waitFor(
                () => {
                    const matches = screen.getAllByText('Software Engineer');
                    expect(matches.length).toBeGreaterThan(0);
                },
                { timeout: 5_000 },
            );

            // Click the first occurrence — the job list card
            // The Jobs page renders each job title as a clickable div with class text-blue-600
            const jobCards = screen.getAllByText('Software Engineer');
            // Find the one that is a link or inside a clickable container
            const jobCard = jobCards.find(el =>
                el.closest('a') ?? el.closest('[role="button"]') ?? el.closest('[onClick]')
            ) ?? jobCards[0];
            await user.click(jobCard);

            // ── STEP 5: Click Pipeline tab ────────────────────────────────
            await waitFor(
                () =>
                    expect(
                        screen.getByRole('button', { name: /pipeline/i }),
                    ).toBeInTheDocument(),
                { timeout: 5_000 },
            );
            await user.click(screen.getByRole('button', { name: /pipeline/i }));

            // ── STEP 6: Wait for candidate to appear ──────────────────────
            await waitFor(
                () =>
                    expect(
                        screen.getByText('John Doe'),
                    ).toBeInTheDocument(),
                { timeout: 5_000 },
            );

            // ── STEP 7: Simulate drag-and-drop to Hired ───────────────────
            await waitFor(
                () => {
                    if (!window.mockOnDragEnd)
                        throw new Error('DnD context not initialized');
                },
                { timeout: 5_000 },
            );

            await act(async () => {
                window.mockOnDragEnd({
                    draggableId: 'cand-456',
                    source: { droppableId: 'new' },
                    destination: { droppableId: 'hired' },
                    type: 'CANDIDATE',
                });
            });

            // ── STEP 8: Verify candidate moved in UI ──────────────────────
            await waitFor(
                () => {
                    const hiredColumn = screen.getByTestId(
                        'droppable-CANDIDATE-hired',
                    );
                    expect(hiredColumn).toHaveTextContent(/John Doe/i);
                },
                { timeout: 5_000 },
            );

            // Confirm the PUT handler incremented hireCount
            expect(hireCount).toBe(1);

            // ── STEP 9: Navigate back to Dashboard ────────────────────────
            // Sidebar label is "Home" (href="/dashboard") per Sidebar.jsx
            await waitFor(
                () =>
                    expect(
                        screen.getByText(/^Home$/i),
                    ).toBeInTheDocument(),
                { timeout: 5_000 },
            );
            await user.click(screen.getByText(/^Home$/i));

            await waitFor(
                () =>
                    expect(
                        screen.getByText(/Welcome, Owner User/i),
                    ).toBeInTheDocument(),
                { timeout: 5_000 },
            );

            // ── STEP 10: Verify hire count updated in TopPerformersWidget ──
            // react-query refetches on mount — hireCount is now 1 so mock
            // returns [{ name: 'Owner User', count: 1 }]
            // UserAvatar renders: <span>{count} {label}</span> = "1 hires"
            await waitFor(
                () =>
                    expect(
                        screen.getByText('1 hires'),
                    ).toBeInTheDocument(),
                { timeout: 10_000 },
            );
        },
        40_000,
    );
});