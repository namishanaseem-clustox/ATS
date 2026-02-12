import React, { useState, useEffect } from 'react';
import { createCandidate, updateCandidate } from '../api/candidates';
import JobSelector from './JobSelector';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const CandidateForm = ({ initialData, onSuccess, onCancel }) => {
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
        skills: '',
        education: [],
        experience_history: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                first_name: initialData.first_name || '',
                last_name: initialData.last_name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                location: initialData.location || '',
                current_company: initialData.current_company || '',
                current_position: initialData.current_position || '',
                experience_years: initialData.experience_years || 0,
                linkedin_url: initialData.social_links?.linkedin || '',
                skills: initialData.skills ? initialData.skills.join(', ') : '',
                education: initialData.education || [],
                experience_history: initialData.experience_history || []
            });
            // Note: Job selection logic might need adjustment if we want to show linked jobs
            // For now, we keep JobSelector as optional for new candidates or unlinked ones
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Experience Handlers ---
    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            experience_history: [
                ...prev.experience_history,
                { title: '', company: '', dates: '', description: '' }
            ]
        }));
    };

    const removeExperience = (index) => {
        setFormData(prev => ({
            ...prev,
            experience_history: prev.experience_history.filter((_, i) => i !== index)
        }));
    };

    const handleExperienceChange = (index, field, value) => {
        const newExp = [...formData.experience_history];
        newExp[index] = { ...newExp[index], [field]: value };
        setFormData(prev => ({ ...prev, experience_history: newExp }));
    };

    // --- Education Handlers ---
    const addEducation = () => {
        setFormData(prev => ({
            ...prev,
            education: [
                ...prev.education,
                { school: '', degree: '', year: '' }
            ]
        }));
    };

    const removeEducation = (index) => {
        setFormData(prev => ({
            ...prev,
            education: prev.education.filter((_, i) => i !== index)
        }));
    };

    const handleEducationChange = (index, field, value) => {
        const newEdu = [...formData.education];
        newEdu[index] = { ...newEdu[index], [field]: value };
        setFormData(prev => ({ ...prev, education: newEdu }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            experience_years: parseFloat(formData.experience_years),
            social_links: formData.linkedin_url ? { linkedin: formData.linkedin_url } : {},
            job_id: selectedJobId,
            skills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
        };

        try {
            if (initialData) {
                await updateCandidate(initialData.id, payload);
            } else {
                await createCandidate(payload);
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to save candidate", error);
            alert("Failed to save candidate. Please check the form and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {!initialData && (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
                    <JobSelector
                        selectedJobId={selectedJobId}
                        onSelect={setSelectedJobId}
                        label="Assign to Job (Optional)"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                    <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
                    <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Current Company</label>
                    <input type="text" name="current_company" value={formData.current_company} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Current Position</label>
                    <input type="text" name="current_position" value={formData.current_position} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Experience (Years)</label>
                <input type="number" name="experience_years" step="0.1" min="0" value={formData.experience_years} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]" />
            </div>

            {/* Skills */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
                <textarea
                    name="skills"
                    rows="2"
                    value={formData.skills}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#00C853] focus:border-[#00C853]"
                    placeholder="Java, Python, React, Leadership"
                />
            </div>

            {/* Experience History */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Experience History</label>
                    <button type="button" onClick={addExperience} className="text-sm text-[#00C853] hover:text-green-700 flex items-center">
                        <Plus size={16} className="mr-1" /> Add
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.experience_history.map((exp, index) => (
                        <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-md relative group">
                            <button
                                type="button"
                                onClick={() => removeExperience(index)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <input placeholder="Title" value={exp.title} onChange={(e) => handleExperienceChange(index, 'title', e.target.value)} className="text-sm border-gray-300 rounded-md" />
                                <input placeholder="Company" value={exp.company} onChange={(e) => handleExperienceChange(index, 'company', e.target.value)} className="text-sm border-gray-300 rounded-md" />
                            </div>
                            <div className="grid grid-cols-1 gap-3 mb-2">
                                <input placeholder="Dates (e.g. Jan 2020 - Present)" value={exp.dates} onChange={(e) => handleExperienceChange(index, 'dates', e.target.value)} className="text-sm border-gray-300 rounded-md" />
                            </div>
                            <textarea placeholder="Description" rows="2" value={exp.description} onChange={(e) => handleExperienceChange(index, 'description', e.target.value)} className="w-full text-sm border-gray-300 rounded-md" />
                        </div>
                    ))}
                    {formData.experience_history.length === 0 && <p className="text-sm text-gray-500 italic">No experience added.</p>}
                </div>
            </div>

            {/* Education */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Education</label>
                    <button type="button" onClick={addEducation} className="text-sm text-[#00C853] hover:text-green-700 flex items-center">
                        <Plus size={16} className="mr-1" /> Add
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.education.map((edu, index) => (
                        <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-md relative group">
                            <button
                                type="button"
                                onClick={() => removeEducation(index)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                            <div className="grid grid-cols-3 gap-3">
                                <input placeholder="School" value={edu.school} onChange={(e) => handleEducationChange(index, 'school', e.target.value)} className="col-span-1 text-sm border-gray-300 rounded-md" />
                                <input placeholder="Degree" value={edu.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} className="col-span-1 text-sm border-gray-300 rounded-md" />
                                <input placeholder="Year" value={edu.year} onChange={(e) => handleEducationChange(index, 'year', e.target.value)} className="col-span-1 text-sm border-gray-300 rounded-md" />
                            </div>
                        </div>
                    ))}
                    {formData.education.length === 0 && <p className="text-sm text-gray-500 italic">No education added.</p>}
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
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? "Update Candidate" : "Save Candidate")}
                </button>
            </div>
        </form>
    );
};

export default CandidateForm;
