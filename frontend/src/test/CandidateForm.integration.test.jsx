/**
 * CandidateForm Integration Tests
 *
 * Strategy: Render CandidateForm within a simulated environment.
 * We mock `JobSelector` to avoid dealing with the full async dropdown logic,
 * focusing purely on the form's state management and submission payloads.
 * We intercept `createCandidate` and `updateCandidate` API calls via MSW to verify payloads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from './server';
import { http, HttpResponse } from 'msw';
import CandidateForm from '../components/CandidateForm';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the JobSelector to simplify testing of the form's payload submission
vi.mock('../components/JobSelector', () => {
    return {
        default: ({ selectedJobId, onSelect, label }) => (
            <div data-testid="job-selector-mock">
                <label>{label}</label>
                <select
                    data-testid="job-select-input"
                    value={selectedJobId || ''}
                    onChange={(e) => onSelect(e.target.value || null)}
                >
                    <option value="">No Job</option>
                    <option value="job-1">Frontend Developer</option>
                    <option value="job-2">Backend Developer</option>
                </select>
            </div>
        )
    };
});

// Mock window.alert
const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });

vi.stubGlobal('localStorage', {
    getItem: () => 'fake-token',
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
});

// ─── Sample Data ─────────────────────────────────────────────────────────────

const mockInitialData = {
    id: 'c-123',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    location: 'San Francisco',
    current_company: 'Tech Corp',
    current_position: 'Senior Engineer',
    experience_years: 5.5,
    notice_period: 30,
    skills: ['React', 'Node'],
    social_links: { linkedin: 'https://linkedin.com/in/janedoe' },
    education: [
        { school: 'MIT', degree: 'BS CS', year: '2015' }
    ],
    experience_history: [
        { title: 'Engineer', company: 'Startup', dates: '2015-2020', description: 'Did things' }
    ]
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderForm = (props = {}) => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    const result = render(
        <CandidateForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
    );
    return { ...result, onSuccess, onCancel, user: userEvent.setup() };
};

const getInput = (name) => document.querySelector(`[name="${name}"]`);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CandidateForm Integration Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. Initial Render & Populate Data ────────────────────────────────

    it('renders empty fields when no initialData is provided (Create mode)', () => {
        renderForm();

        expect(getInput('first_name')).toHaveValue('');
        expect(getInput('last_name')).toHaveValue('');
        expect(getInput('email')).toHaveValue('');
        expect(screen.getByRole('button', { name: /Save Candidate/i })).toBeInTheDocument();
    });

    it('populates fields correctly when initialData is provided (Edit mode)', () => {
        renderForm({ initialData: mockInitialData });

        expect(getInput('first_name')).toHaveValue('Jane');
        expect(getInput('last_name')).toHaveValue('Doe');
        expect(getInput('email')).toHaveValue('jane@example.com');
        expect(getInput('experience_years')).toHaveValue(5.5);
        expect(getInput('notice_period')).toHaveValue(30);
        expect(getInput('skills')).toHaveValue('React, Node');
        expect(getInput('linkedin_url')).toHaveValue('https://linkedin.com/in/janedoe');

        // Dynamic fields should be rendered
        expect(screen.getByDisplayValue('MIT')).toBeInTheDocument();
        expect(screen.getByDisplayValue('BS CS')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Engineer')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Startup')).toBeInTheDocument();

        expect(screen.getByRole('button', { name: /Update Candidate/i })).toBeInTheDocument();
    });

    // ── 2. Dynamic Fields (Experience & Education) ───────────────────────

    it('allows adding and removing experience entries', async () => {
        const { user } = renderForm();

        // Add
        const addExpBtns = screen.getAllByRole('button', { name: /Add/i });
        // The first "Add" button is for Experience, the second for Education
        await user.click(addExpBtns[0]);

        const titleInputs = screen.getAllByPlaceholderText('Title');
        expect(titleInputs).toHaveLength(1);

        await user.type(titleInputs[0], 'New Job');
        expect(titleInputs[0]).toHaveValue('New Job');

        // Remove
        const removeBtns = screen.getAllByRole('button');
        const trashBtn = removeBtns.find(b => b.innerHTML.includes('lucide-trash'));
        await user.click(trashBtn);

        expect(screen.queryByPlaceholderText('Title')).not.toBeInTheDocument();
        expect(screen.getByText('No experience added.')).toBeInTheDocument();
    });

    it('allows adding and removing education entries', async () => {
        const { user } = renderForm();

        const addBtns = screen.getAllByRole('button', { name: /Add/i });
        // Second button is education
        await user.click(addBtns[1]);

        const schoolInputs = screen.getAllByPlaceholderText('School');
        expect(schoolInputs).toHaveLength(1);

        await user.type(schoolInputs[0], 'Harvard');
        expect(schoolInputs[0]).toHaveValue('Harvard');

        // Remove
        const buttons = screen.getAllByRole('button');
        const trashBtn = buttons.reverse().find(b => b.innerHTML.includes('lucide-trash'));
        await user.click(trashBtn);

        expect(screen.queryByPlaceholderText('School')).not.toBeInTheDocument();
        expect(screen.getByText('No education added.')).toBeInTheDocument();
    });

    // ── 3. Job Selection ───────────────────────────────────────────────────

    it('allows selecting a job to link', async () => {
        const { user } = renderForm();

        const select = screen.getByTestId('job-select-input');
        await user.selectOptions(select, 'job-1');

        expect(select).toHaveValue('job-1');
    });

    // ── 4. Form Submission (Create) ────────────────────────────────────────

    it('submits correctly parsed payload for new candidate', async () => {
        let capturedPayload = null;

        server.use(
            http.post('*/candidates/', async ({ request }) => {
                capturedPayload = await request.json();
                return HttpResponse.json({ id: 'new-cand', ...capturedPayload });
            })
        );

        const { user, onSuccess } = renderForm();

        // Fill out required strings
        await user.type(getInput('first_name'), 'John');
        await user.type(getInput('last_name'), 'Smith');
        await user.type(getInput('email'), 'john@example.com');

        // Fill out numbers and skills
        await user.type(getInput('experience_years'), '3.5');
        await user.type(getInput('notice_period'), '14');
        await user.type(getInput('skills'), '  HTML, CSS , JS ');
        await user.type(getInput('linkedin_url'), 'https://linkedin.com/in/john');

        // Select a job
        await user.selectOptions(screen.getByTestId('job-select-input'), 'job-2');

        // Submit
        await user.click(screen.getByRole('button', { name: /Save Candidate/i }));

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
        });

        // Verify payload parsing
        expect(capturedPayload).toMatchObject({
            first_name: 'John',
            last_name: 'Smith',
            email: 'john@example.com',
            experience_years: 3.5, // Parsed as float
            notice_period: 14,     // Parsed as int
            skills: ['HTML', 'CSS', 'JS'], // Split and trimmed
            social_links: { linkedin: 'https://linkedin.com/in/john' },
            job_id: 'job-2',
            education: [],
            experience_history: []
        });
    });

    // ── 5. Form Submission (Update) ────────────────────────────────────────

    it('submits updated payload for existing candidate', async () => {
        let capturedPayload = null;
        let capturedId = null;

        server.use(
            http.put('*/candidates/:id', async ({ request, params }) => {
                capturedId = params.id;
                capturedPayload = await request.json();
                return HttpResponse.json({ id: capturedId, ...capturedPayload });
            })
        );

        const { user, onSuccess } = renderForm({ initialData: mockInitialData });

        // Update a field
        const emailInput = getInput('email');
        await user.clear(emailInput);
        await user.type(emailInput, 'jane_new@example.com');

        // Submit
        await user.click(screen.getByRole('button', { name: /Update Candidate/i }));

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
        });

        expect(capturedId).toBe('c-123'); // API hit correct URL
        expect(capturedPayload.email).toBe('jane_new@example.com');
        // Unchanged fields remain
        expect(capturedPayload.first_name).toBe('Jane');
        expect(capturedPayload.experience_history[0].company).toBe('Startup');
    });

    // ── 6. Error Handling ──────────────────────────────────────────────────

    it('shows alert and stays open on API error', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

        server.use(
            http.post('*/candidates/', () => {
                return HttpResponse.json({ detail: 'Server Error' }, { status: 500 });
            })
        );

        const { user, onSuccess } = renderForm();

        await user.type(getInput('first_name'), 'Fail');
        await user.type(getInput('last_name'), 'Test');
        await user.type(getInput('email'), 'fail@test.com');

        await user.click(screen.getByRole('button', { name: /Save Candidate/i }));

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to save candidate'));
        });

        expect(onSuccess).not.toHaveBeenCalled();
        // The save button should re-enable
        expect(screen.getByRole('button', { name: /Save Candidate/i })).not.toBeDisabled();

        consoleError.mockRestore();
    });

    // ── 7. Cancel Button ───────────────────────────────────────────────────

    it('calls onCancel when the Cancel button is clicked', async () => {
        const { user, onCancel } = renderForm();

        await user.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
