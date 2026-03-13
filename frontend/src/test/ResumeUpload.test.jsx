import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResumeUpload from '../components/ResumeUpload';
import * as candidatesApi from '../api/candidates';

vi.mock('../api/candidates');
vi.mock('../components/JobSelector', () => ({
    default: ({ selectedJobId, onSelect, label }) => (
        <div data-testid="job-selector">
            <label>{label}</label>
            <button onClick={() => onSelect('job-123')}>Select Job 123</button>
            <button onClick={() => onSelect(null)}>Clear Job</button>
            <span data-testid="selected-job">{selectedJobId || 'none'}</span>
        </div>
    )
}));

describe('ResumeUpload Component', () => {
    const mockOnUploadSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the component with job selector and upload area', () => {
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        expect(screen.getByTestId('job-selector')).toBeInTheDocument();
        expect(screen.getByText(/Click or drag resume here/i)).toBeInTheDocument();
        expect(screen.getByText(/Supported formats: PDF, DOC, DOCX/i)).toBeInTheDocument();
    });

    it('allows selecting a job via JobSelector', () => {
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        expect(screen.getByTestId('selected-job')).toHaveTextContent('none');

        fireEvent.click(screen.getByText('Select Job 123'));

        expect(screen.getByTestId('selected-job')).toHaveTextContent('job-123');
    });

    it('allows clearing job selection', () => {
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        fireEvent.click(screen.getByText('Select Job 123'));
        expect(screen.getByTestId('selected-job')).toHaveTextContent('job-123');

        fireEvent.click(screen.getByText('Clear Job'));
        expect(screen.getByTestId('selected-job')).toHaveTextContent('none');
    });

    it('handles file selection via input', async () => {
        candidatesApi.uploadResume.mockResolvedValue({});
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
        const input = document.getElementById('resume-upload');

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText(/Parsing resume.../i)).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(candidatesApi.uploadResume).toHaveBeenCalled();
            const formData = candidatesApi.uploadResume.mock.calls[0][0];
            expect(formData).toBeInstanceOf(FormData);
            expect(formData.get('file')).toBe(file);
        });

        await waitFor(() => {
            expect(mockOnUploadSuccess).toHaveBeenCalled();
        });
    });

    it('includes job_id in FormData when a job is selected', async () => {
        candidatesApi.uploadResume.mockResolvedValue({});
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        // Select a job first
        fireEvent.click(screen.getByText('Select Job 123'));

        const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
        const input = document.getElementById('resume-upload');

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(candidatesApi.uploadResume).toHaveBeenCalled();
            const formData = candidatesApi.uploadResume.mock.calls[0][0];
            expect(formData.get('job_id')).toBe('job-123');
        });
    });

    it('does not include job_id when no job is selected', async () => {
        candidatesApi.uploadResume.mockResolvedValue({});
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
        const input = document.getElementById('resume-upload');

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(candidatesApi.uploadResume).toHaveBeenCalled();
            const formData = candidatesApi.uploadResume.mock.calls[0][0];
            expect(formData.get('job_id')).toBeNull();
        });
    });

    it('shows error message on upload failure', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        candidatesApi.uploadResume.mockRejectedValue(new Error('Upload failed'));
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
        const input = document.getElementById('resume-upload');

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText(/Failed to upload resume. Please try again./i)).toBeInTheDocument();
        });

        expect(mockOnUploadSuccess).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('handles drag enter event', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('[ondragenter]') || container.querySelector('.border-dashed');

        fireEvent.dragEnter(dropZone, {
            dataTransfer: { files: [new File([''], 'test.pdf')] }
        });

        // Should add dragging styles
        expect(dropZone).toHaveClass('border-[#00C853]');
    });

    it('handles drag over event', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('.border-dashed');

        fireEvent.dragOver(dropZone, {
            dataTransfer: { files: [new File([''], 'test.pdf')] }
        });

        expect(dropZone).toHaveClass('border-[#00C853]');
    });

    it('handles drag leave event', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('.border-dashed');

        // First drag enter
        fireEvent.dragEnter(dropZone, {
            dataTransfer: { files: [new File([''], 'test.pdf')] }
        });

        expect(dropZone).toHaveClass('border-[#00C853]');

        // Then drag leave
        fireEvent.dragLeave(dropZone);

        expect(dropZone).not.toHaveClass('border-[#00C853]');
    });

    it('handles file drop', async () => {
        candidatesApi.uploadResume.mockResolvedValue({});
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('.border-dashed');
        const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });

        fireEvent.drop(dropZone, {
            dataTransfer: {
                files: [file]
            }
        });

        await waitFor(() => {
            expect(candidatesApi.uploadResume).toHaveBeenCalled();
        });
    });

    it('shows loading state during upload', async () => {
        candidatesApi.uploadResume.mockImplementation(() => new Promise(() => {})); // Never resolves
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
        const input = document.getElementById('resume-upload');

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText(/Parsing resume.../i)).toBeInTheDocument();
            expect(screen.getByText(/This might take a few seconds/i)).toBeInTheDocument();
        });
    });

    it('triggers file input click when drop zone is clicked', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const input = document.getElementById('resume-upload');
        const clickSpy = vi.spyOn(input, 'click');

        const dropZone = container.querySelector('.border-dashed');
        fireEvent.click(dropZone);

        expect(clickSpy).toHaveBeenCalled();
    });

    it('handles drop with no files', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('.border-dashed');

        fireEvent.drop(dropZone, {
            dataTransfer: {
                files: []
            }
        });

        expect(candidatesApi.uploadResume).not.toHaveBeenCalled();
    });

    it('handles file input change with no files', () => {
        render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const input = document.getElementById('resume-upload');

        Object.defineProperty(input, 'files', {
            value: [],
            writable: false
        });

        fireEvent.change(input);

        expect(candidatesApi.uploadResume).not.toHaveBeenCalled();
    });

    it('prevents default on drag events', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('.border-dashed');

        const dragEnterEvent = new Event('dragenter', { bubbles: true, cancelable: true });
        const preventDefaultSpy = vi.spyOn(dragEnterEvent, 'preventDefault');

        dropZone.dispatchEvent(dragEnterEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('stops propagation on drag events', () => {
        const { container } = render(<ResumeUpload onUploadSuccess={mockOnUploadSuccess} />);

        const dropZone = container.querySelector('.border-dashed');

        const dragEnterEvent = new Event('dragenter', { bubbles: true, cancelable: true });
        const stopPropagationSpy = vi.spyOn(dragEnterEvent, 'stopPropagation');

        dropZone.dispatchEvent(dragEnterEvent);

        expect(stopPropagationSpy).toHaveBeenCalled();
    });
});
