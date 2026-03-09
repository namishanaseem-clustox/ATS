import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import App from '../App';

describe('E2E Test: Post a Job Journey', () => {
    afterEach(() => {
        localStorage.clear();
        window.history.pushState({}, 'Test page', '/');
    });

    it('Login -> Create Dept -> Create Job -> View on Board', async () => {
        // State for our mock backend
        let mockDepartments = [];
        let mockJobs = [];

        // Configure MSW dynamic handlers for this specific test
        server.use(
            // 1. Auth Handlers
            http.post('*/token', () => {
                return HttpResponse.json({ access_token: 'fake-jwt', token_type: 'bearer' });
            }),
            http.get('*/users/me', () => {
                return HttpResponse.json({
                    id: 'u1',
                    email: 'owner@clustox.com',
                    full_name: 'Owner User',
                    role: 'owner',
                    is_active: true
                });
            }),
            http.get('*/users', () => {
                return HttpResponse.json([
                    { id: 'u1', email: 'owner@clustox.com', full_name: 'Owner User', role: 'owner' }
                ]);
            }),

            // 2. Department Handlers
            http.get('*/departments', () => {
                return HttpResponse.json(mockDepartments);
            }),
            http.post('*/departments', async ({ request }) => {
                const newDept = await request.json();
                const createdDept = { id: `dept-${Date.now()}`, created_at: new Date().toISOString(), ...newDept };
                mockDepartments.push(createdDept);
                return HttpResponse.json(createdDept, { status: 201 });
            }),

            // 3. Pipeline Template Handlers (used by JobForm)
            http.get('*/pipeline/templates', () => {
                return HttpResponse.json([
                    { id: 'tpl-1', name: 'Standard Pipeline', is_default: true, stages: [] }
                ]);
            }),

            // 4. Job Handlers
            http.get('*/jobs', ({ request }) => {
                const url = new URL(request.url);
                const status = url.searchParams.get('status');

                // Return filtered mock jobs based on queried status to avoid duplicate keys in UI
                let result = mockJobs;
                if (status === 'Archived') {
                    result = mockJobs.filter(j => j.status === 'Archived');
                } else if (!status) {
                    result = mockJobs.filter(j => j.status !== 'Archived');
                }

                return HttpResponse.json(result);
            }),
            http.post('*/jobs', async ({ request }) => {
                const newJob = await request.json();

                // Find department to attach name for the frontend list
                const dept = mockDepartments.find(d => d.id === newJob.department_id) || { name: 'Unknown Dept' };

                const createdJob = {
                    id: `job-${Date.now()}`,
                    ...newJob,
                    department: { name: dept.name },
                    created_at: new Date().toISOString()
                };
                mockJobs.push(createdJob); console.log("MOCK POST /jobs", createdJob);
                return HttpResponse.json(createdJob, { status: 201 });
            })
        );

        // Start of test
        const user = userEvent.setup();

        render(<App />);

        // --- STEP 1: Login ---
        expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();
        await user.type(screen.getByLabelText(/Email address/i), 'owner@clustox.com');
        await user.type(screen.getByLabelText(/Password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /Sign in/i }));

        // Wait to reach the Dashboard
        expect(await screen.findByText(/Welcome, Owner User/i)).toBeInTheDocument();

        // --- STEP 2: Navigate to Departments & Create ---
        // For 'owner' role, Departments is inside Administration
        const adminNavButton = await screen.findByRole('link', { name: /Administration/i });
        await user.click(adminNavButton);

        // We are on Admin page, find the AdminCard by looking for the heading 'Departments'
        // Role link with name /Departments/i matches the card text.
        const departmentsAdminCard = await waitFor(() => screen.findByRole('link', { name: /Departments Configure/i }));
        await user.click(departmentsAdminCard);

        // Click Add Department (When empty, UI shows "Create your first department")
        const addDeptButton = await waitFor(() => screen.findByRole('button', { name: /Create your first department/i }), { timeout: 3000 });
        await user.click(addDeptButton);

        // Wait for modal and fill out form
        expect(await screen.findByText('New Department')).toBeInTheDocument();
        const deptNameInput = screen.getByPlaceholderText('e.g. Engineering');
        await user.type(deptNameInput, 'New E2E Dept');

        // Find and click the 'Create Department' button inside the modal
        const createDeptSubmit = screen.getByRole('button', { name: 'Create Department' });
        await user.click(createDeptSubmit);

        // Wait for modal to close and the new department to appear in the table
        expect(await screen.findByText('New E2E Dept')).toBeInTheDocument();

        // --- STEP 3: Navigate to Jobs & Create ---
        const jobsNavButton = await screen.findByRole('link', { name: /^Jobs$/i });
        await user.click(jobsNavButton);

        // Click Create Job button
        const postJobButton = await screen.findByRole('button', { name: /Create your first job/i });
        await user.click(postJobButton);

        // Wait for Job Wizard to load
        expect(await screen.findByText('Create New Job')).toBeInTheDocument();

        // Fill Job Title. Label is Custom, but it has input text box
        const titleInput = document.querySelector('input[name="title"]');
        await user.type(titleInput, 'New E2E Job Title');

        // Select Department using CustomSelect
        const deptSelectButton = await screen.findByText('Select Department');
        await user.click(deptSelectButton);

        // Verify open
        await waitFor(() => expect(screen.queryByText('New E2E Dept')).toBeInTheDocument());

        // Click option
        const deptOption = await screen.findByText('New E2E Dept', { selector: 'span.block' });
        await user.click(deptOption);

        // Verify selected/closed
        await waitFor(() => expect(deptSelectButton).toHaveTextContent('New E2E Dept'));

        // Select Employment Type simply by ensuring default "Full-time" is fine, or choose it
        // The CustomSelect already defaults to 'Full-time'. We'll leave it.

        // --- STEP 4: Publish ---
        // Click Publish button
        const publishButton = screen.getByRole('button', { name: /Publish/i });
        await user.click(publishButton);

        // --- STEP 5: Verify Job on Board ---
        // After publishing, it redirects to /jobs
        await waitFor(async () => {
            expect(await screen.findByRole('heading', { name: /Jobs/i })).toBeInTheDocument();
        }, { timeout: 8000 });

        // Verify job appears (use regex for text matching, scope to table for precision)
        await waitFor(async () => {
            const jobsTable = await screen.findByRole('table');
            expect(within(jobsTable).getByText(/New E2E Job Title/i)).toBeInTheDocument();
        }, { timeout: 8000 });

    }, 30000); // Give it a long timeout since it's a full E2E journey
});
