import React, { useState, useEffect } from 'react';
import { Save, Send } from 'lucide-react';

const JobForm = ({ initialData, departments, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        department_id: '',
        location: '',
        employment_type: 'Full-time',
        headcount: 1,
        min_salary: '',
        max_salary: '',
        experience_range: '',
        skills: '', // Comma separated string for input
        description: '',
        deadline: '',
        ...initialData // Override defaults if provided
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (status) => {
        // Process skills into array
        const processedData = {
            ...formData,
            skills: typeof formData.skills === 'string'
                ? formData.skills.split(',').map(s => s.trim()).filter(s => s)
                : formData.skills,
            min_salary: formData.min_salary === '' ? null : formData.min_salary,
            max_salary: formData.max_salary === '' ? null : formData.max_salary,
            deadline: formData.deadline === '' ? null : formData.deadline,
            hiring_manager_id: formData.hiring_manager_id === '' ? null : formData.hiring_manager_id,
            recruiter_id: formData.recruiter_id === '' ? null : formData.recruiter_id,
            status: status
        };
        onSubmit(processedData);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {initialData ? 'Edit Job' : 'Create New Job'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Job Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <select
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                        <select
                            name="employment_type"
                            value={formData.employment_type}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                        >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>
                </div>

                {/* Compensation & Details */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Salary</label>
                            <input
                                type="number"
                                name="min_salary"
                                value={formData.min_salary}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Max Salary</label>
                            <input
                                type="number"
                                name="max_salary"
                                value={formData.max_salary}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Headcount</label>
                            <input
                                type="number"
                                name="headcount"
                                value={formData.headcount}
                                onChange={handleChange}
                                min="1"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Experience</label>
                            <input
                                type="text"
                                name="experience_range"
                                value={formData.experience_range}
                                onChange={handleChange}
                                placeholder="e.g. 1-3 years"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Deadline</label>
                        <input
                            type="date"
                            name="deadline"
                            value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                        />
                    </div>
                </div>
            </div>

            {/* Skills */}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
                <input
                    type="text"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="Python, React, SQL..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                />
            </div>

            {/* Description */}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={10}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C853] focus:ring-[#00C853] sm:text-sm p-2 border"
                    placeholder="Enter job description..."
                />
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end space-x-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => handleSubmit('Draft')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853]"
                >
                    <Save size={16} className="mr-2" />
                    Save Draft
                </button>
                <button
                    type="button"
                    onClick={() => handleSubmit('Published')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00C853] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853]"
                >
                    <Send size={16} className="mr-2" />
                    Publish
                </button>
            </div>
        </div>
    );
};

export default JobForm;
