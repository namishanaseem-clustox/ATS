import { http, HttpResponse } from 'msw';

// Use wildcard patterns — more reliable than exact URLs in MSW v2 node mode
export const handlers = [
    // ── Auth ─────────────────────────────────────────────────────────────────
    http.get('*/users/me', () => {
        return HttpResponse.json({
            id: 'u1',
            email: 'admin@clustox.com',
            full_name: 'Admin User',
            role: 'owner',
            is_active: true
        });
    }),

    // ── Dashboard ─────────────────────────────────────────────────────────────
    http.get('*/dashboard/overview', () => {
        return HttpResponse.json({ total_candidates: 10, total_jobs: 5 });
    }),

    http.get('*/dashboard/recent-activities', () => {
        return HttpResponse.json([]);   // Empty list (no notifications)
    }),

    http.get('*/dashboard/top-performers', () => {
        return HttpResponse.json({
            hires: [{ id: 'p1', name: 'John Doe', count: 5 }],
            candidates: [{ id: 'p1', name: 'John Doe', count: 12 }],
            jobs: [{ id: 'p1', name: 'John Doe', count: 3 }],
            actions: [{ id: 'p1', name: 'John Doe', count: 45 }]
        });
    }),

    http.get('*/dashboard/my-performance', () => {
        return HttpResponse.json([
            { name: 'Jan', candidates: 10 },
            { name: 'Feb', candidates: 25 }
        ]);
    }),

    http.get('*/dashboard/actions-taken', () => {
        return HttpResponse.json([]);
    }),

    // ── Jobs ──────────────────────────────────────────────────────────────────
    http.get('*/jobs', () => {
        return HttpResponse.json([
            { id: 'j1', title: 'Frontend Developer', status: 'Published', department: { name: 'Engineering' } }
        ]);
    }),

    http.get('*/jobs/requisitions', () => {
        return HttpResponse.json([
            { id: 'req1', job_title: 'Software Engineer', status: 'Pending', requester: { full_name: 'Jane Smith' } }
        ]);
    }),

    // ── Candidates ────────────────────────────────────────────────────────────
    http.get('*/candidates/', () => {
        return HttpResponse.json([
            {
                id: 'c1',
                first_name: 'Alice',
                last_name: 'Wonderland',
                current_position: 'Developer',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                applications: []
            }
        ]);
    }),

    // ── Activities ────────────────────────────────────────────────────────────
    http.get('*/activities/my-interviews/', () => {
        return HttpResponse.json([
            { id: 'act1', type: 'Interview', title: 'Technical Interview', status: 'Pending', scheduled_at: new Date().toISOString() }
        ]);
    }),

    http.get('*/activities/all/', () => {
        return HttpResponse.json([]);
    }),
];
