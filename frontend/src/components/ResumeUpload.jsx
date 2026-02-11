import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import JobSelector from './JobSelector';
import { uploadResume } from '../api/candidates';

const ResumeUpload = ({ onUploadSuccess }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [error, setError] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            await handleUpload(files[0]);
        }
    }, [selectedJobId]);

    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files[0]) {
            await handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file) => {
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        if (selectedJobId) {
            formData.append('job_id', selectedJobId);
        }

        try {
            await uploadResume(formData);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            console.error("Upload failed", err);
            setError("Failed to upload resume. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <JobSelector
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
                label="Assign Candidate to Job (Optional)"
            />

            <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
                    ${isDragging ? 'border-[#00C853] bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('resume-upload').click()}
            >
                <input
                    type="file"
                    id="resume-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                />

                {uploading ? (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#00C853]" />
                        <p className="font-medium">Parsing resume...</p>
                        <p className="text-sm">This might take a few seconds.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-[#00C853]' : 'text-gray-400'}`} />
                        <p className="font-medium text-lg text-gray-700">Click or drag resume here</p>
                        <p className="text-sm mt-1">Supported formats: PDF, DOC, DOCX</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ResumeUpload;
