import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateUser } from '../../api/users';
import Breadcrumb from '../../components/Breadcrumb';
import { Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ProfileSettings = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
            };
            if (formData.new_password) {
                payload.password = formData.new_password;
            }
            const updated = await updateUser(user.id, payload);
            if (setUser) setUser(updated);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
            setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
        } catch (err) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to save changes.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Breadcrumb items={[{ label: 'Settings', to: '/settings' }, { label: 'My Profile' }]} />
            <div className="mb-6 flex items-center gap-3">
                <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Update your personal information and password.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-5">
                {/* Personal Info */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        name="full_name"
                        type="text"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                </div>

                <hr className="border-gray-100" />

                {/* Password Change */}
                <p className="text-sm font-semibold text-gray-700">Change Password <span className="font-normal text-gray-400">(leave blank to keep current)</span></p>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                        name="new_password"
                        type={showNewPw ? 'text' : 'password'}
                        value={formData.new_password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                        name="confirm_password"
                        type="password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                    />
                </div>

                {message && (
                    <div className={`text-sm px-3 py-2 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00C853] text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettings;
