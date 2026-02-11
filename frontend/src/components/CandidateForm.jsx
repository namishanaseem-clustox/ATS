import React, { useState } from 'react';
import { createCandidate } from '../api/candidates';
import JobSelector from './JobSelector';
import { Loader2 } from 'lucide-react';

const CandidateForm = ({ onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: '',
        current_company: '',
        current_position: '',
        experience_years: 0,
        linkedin_url: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            experience_years: parseFloat(formData.experience_years),
            social_links: formData.linkedin_url ? { linkedin: formData.linkedin_url } : {},
            job_id: selectedJobId
        };

        try {
            await createCandidate(payload);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to create candidate", error);
            alert("Failed to create candidate. Please check the form and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
                <JobSelector
                    selectedJobId={selectedJobId}
                    onSelect={setSelectedJobId}
                    label="Assign to Job (Optional)"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                    <input
                        type="text"
                        name="first_name"
                        required
                        value={formData.first_name}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                        type="text"
                        name="last_name"
                        required
                        value={formData.last_name}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Current Company</label>
                    <input
                        type="text"
                        name="current_company"
                        value={formData.current_company}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Current Position</label>
                    <input
                        type="text"
                        name="current_position"
                        value={formData.current_position}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Experience (Years)</label>
                    <input
                        type="number"
                        name="experience_years"
                        step="0.1"
                        min="0"
                        value={formData.experience_years}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
                    <input
                        type="url"
                        name="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#00C853] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853] disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Candidate"}
                </button>
            </div>
        </form>
    );
};

export default CandidateForm;
