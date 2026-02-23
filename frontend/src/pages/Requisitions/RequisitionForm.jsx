import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../api/departments';
import { createRequisition, getRequisition, updateRequisition } from '../../api/requisitions';

const RequisitionForm = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(!!id);

    const [formData, setFormData] = useState({
        job_title: '',
        department_id: user?.department_id || '',
        location: '',
        employment_type: 'Full-time',
        min_salary: '',
        max_salary: '',
        currency: 'USD',
        has_equity_bonus: false,
        budget_code: '',
        justification: ''
    });

    useEffect(() => {
        getDepartments().then(setDepartments);

        if (id) {
            getRequisition(id).then(req => {
                setFormData({
                    job_title: req.job_title || '',
                    department_id: req.department_id || '',
                    location: req.location || '',
                    employment_type: req.employment_type || 'Full-time',
                    min_salary: req.min_salary || '',
                    max_salary: req.max_salary || '',
                    currency: req.currency || 'USD',
                    has_equity_bonus: req.has_equity_bonus || false,
                    budget_code: req.budget_code || '',
                    justification: req.justification || ''
                });
                setLoading(false);
            }).catch(err => {
                console.error(err);
                alert("Failed to load requisition");
                setLoading(false);
            });
        } else if (user?.department_id) {
            setFormData(prev => ({ ...prev, department_id: user.department_id }));
        }
    }, [id, user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                min_salary: formData.min_salary ? parseFloat(formData.min_salary) : null,
                max_salary: formData.max_salary ? parseFloat(formData.max_salary) : null
            };

            if (id) {
                await updateRequisition(id, payload);
                navigate(`/requisitions/${id}`);
            } else {
                await createRequisition(payload);
                navigate('/requisitions');
            }
        } catch (error) {
            console.error(error);
            alert(`Failed to ${id ? 'update' : 'submit'} requisition`);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading form...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
                {id ? 'Edit Requisition' : 'Request New Hire'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
                {/* Basic Section */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Job Title *</label>
                        <input required type="text" name="job_title" value={formData.job_title} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Department *</label>
                        <select required name="department_id" value={formData.department_id} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm bg-white">
                            <option value="">Select Department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location *</label>
                        <input required type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Employment Type *</label>
                        <select required name="employment_type" value={formData.employment_type} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm bg-white">
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>
                </div>

                <hr className="my-6 border-gray-200" />
                <h3 className="text-lg font-medium text-gray-900">Budget & Compensation</h3>

                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Min Salary Option</label>
                        <input type="number" name="min_salary" value={formData.min_salary} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Salary Option</label>
                        <input type="number" name="max_salary" value={formData.max_salary} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <input type="text" name="currency" value={formData.currency} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Budget / Cost Center</label>
                        <input type="text" name="budget_code" value={formData.budget_code} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm" />
                    </div>
                    <div className="flex items-center mt-6">
                        <input type="checkbox" name="has_equity_bonus" checked={formData.has_equity_bonus} onChange={handleChange} className="h-4 w-4 text-[#00C853] focus:ring-[#00C853] border-gray-300 rounded" />
                        <label className="ml-2 block text-sm text-gray-900">Equity / Bonus Eligibility</label>
                    </div>
                </div>

                <hr className="my-6 border-gray-200" />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Case / Justification</label>
                    <textarea rows="4" name="justification" value={formData.justification} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm placeholder-gray-400" placeholder="Explain why your team needs this headcount..."></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => navigate('/requisitions')} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853]">
                        Cancel
                    </button>
                    <button type="submit" className="bg-[#00C853] border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853]">
                        Save as Draft
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RequisitionForm;
