import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { getUsers } from '../api/users';
import { useQuery } from '@tanstack/react-query';

const DepartmentModal = ({ isOpen, onClose, onSubmit, initialData }) => {

    // Simple form state management
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        status: 'Active',
        owner_id: ''
    });

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
        enabled: isOpen, // Only fetch when modal is open
    });

    // Filter users to show only potential hiring managers (Owner, HR, Hiring Manager)
    // Or just show all? Requirement says "assign a hiring manager", implying role specific.
    // Let's filter for relevant roles to keep list clean, or just all active users.
    // Let's assume any user can be an owner for now, or filter by 'hiring_manager' role if strict.
    // Plan said "Fetch list of users". Let's map all users for now.
    const userOptions = (users || []).map(u => ({
        value: u.id,
        label: `${u.full_name} (${u.email})`
    }));
    // Add "Unassigned" option
    userOptions.unshift({ value: '', label: 'Unassigned' });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                location: initialData.location || '',
                status: initialData.status || 'Active',
                owner_id: initialData.owner_id || ''
            });
        } else {
            setFormData({
                name: '',
                description: '',
                location: '',
                status: 'Active',
                owner_id: ''
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Clean up empty strings to null for optional fields
        const cleanedData = {
            ...formData,
            owner_id: formData.owner_id || null,
            location: formData.location || null,
            description: formData.description || null,
        };
        onSubmit(cleanedData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-dark">
                        {initialData ? 'Edit Department' : 'New Department'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-grey" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark mb-1">Department Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="e.g. Engineering"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark mb-1">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                            placeholder="Brief description of the department..."
                        />
                    </div>

                    <div>
                        <CustomSelect
                            label="Department Owner (Hiring Manager)"
                            name="owner_id"
                            value={formData.owner_id}
                            onChange={handleChange}
                            options={userOptions}
                            placeholder="Select a manager..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-dark mb-1">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                placeholder="e.g. Remote"
                            />
                        </div>
                        <div>
                            <CustomSelect
                                label="Status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                options={[
                                    { value: 'Active', label: 'Active' },
                                    { value: 'Inactive', label: 'Inactive' }
                                ]}
                                className="mb-0"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
                        >
                            {initialData ? 'Update Department' : 'Create Department'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepartmentModal;
