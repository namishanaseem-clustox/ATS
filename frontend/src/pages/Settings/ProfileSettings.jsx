import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateUser, uploadAvatar, removeAvatar } from '../../api/users';
import client from '../../api/client';
import Breadcrumb from '../../components/Breadcrumb';
import { Save, ArrowLeft, Eye, EyeOff, ChevronRight, Check, X, Camera, Trash2 } from 'lucide-react';

const ProfileSettings = () => {
    const { user, setUser, avatarCacheBust, fetchUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Field-level edit state
    const [editingField, setEditingField] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        display_name: user?.display_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        location: user?.location || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const calendarStatus = queryParams.get('calendar');
        if (calendarStatus === 'connected') {
            setMessage({ type: 'success', text: 'Google Calendar connected successfully.' });
            // Re-fetch fresh user data so google_access_token updates in the UI
            if (fetchUser) fetchUser();
            // Clean up URL
            navigate('/settings', { replace: true });
        } else if (calendarStatus === 'error') {
            setMessage({ type: 'error', text: 'Failed to connect Google Calendar. Please try again.' });
            navigate('/settings', { replace: true });
        }
    }, [location.search, navigate, fetchUser]);

    const fileInputRef = useRef(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        setMessage(null);
        try {
            const updated = await uploadAvatar(user.id, file);
            if (setUser) setUser(updated);
            setMessage({ type: 'success', text: 'Profile picture updated successfully.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to update profile picture.' });
        } finally {
            setSaving(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveAvatar = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const updated = await removeAvatar(user.id);
            if (setUser) setUser(updated);
            setMessage({ type: 'success', text: 'Profile picture removed successfully.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to remove profile picture.' });
        } finally {
            setSaving(false);
        }
    };

    // Status
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
    const [resetMessage, setResetMessage] = useState(null); // { type: 'success'|'error', text }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveField = async (field) => {
        setSaving(true);
        setMessage(null);
        try {
            const payload = { [field]: formData[field] };
            const updated = await updateUser(user.id, payload);
            if (setUser) setUser(updated);
            setEditingField(null);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to save changes.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (!formData.new_password) return;

        setSaving(true);
        setMessage(null);
        try {
            const payload = { password: formData.new_password, current_password: formData.current_password };
            await updateUser(user.id, payload);
            setMessage({ type: 'success', text: 'Password updated successfully.' });
            setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
            setEditingField(null);
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to update password.' });
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    // Reusable row component
    const ProfileRow = ({ label, value, fieldName, isEditable = true, type = "text", customValue = null }) => {
        const isEditing = editingField === fieldName;

        return (
            <div className={`flex items-center justify-between py-5 border-b border-gray-100 last:border-0 ${isEditable && !isEditing ? 'cursor-pointer hover:bg-gray-50/50 transition-colors group' : ''}`}
                onClick={() => { if (isEditable && !isEditing) setEditingField(fieldName); }}>

                <div className="w-1/3 text-sm font-medium text-gray-500">{label}</div>

                <div className="flex-1 flex items-center justify-between pr-4">
                    {isEditing ? (
                        <div className="flex-1 flex gap-2 items-center mr-4">
                            <input
                                name={fieldName}
                                type={type}
                                value={formData[fieldName]}
                                onChange={handleChange}
                                autoFocus
                                className="w-full px-3 py-1.5 border border-[#00C853] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveField(fieldName);
                                    if (e.key === 'Escape') {
                                        setEditingField(null);
                                        setFormData(prev => ({ ...prev, [fieldName]: user[fieldName] }));
                                    }
                                }}
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSaveField(fieldName); }}
                                disabled={saving}
                                className="p-1.5 bg-[#00C853] text-white rounded hover:bg-green-700 transition"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingField(null);
                                    setFormData(prev => ({ ...prev, [fieldName]: user[fieldName] }));
                                }}
                                disabled={saving}
                                className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-900 font-medium">
                            {customValue || value}
                        </div>
                    )}

                    {isEditable && !isEditing && (
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 max-w-[1000px] mx-auto min-h-full bg-gray-50/30">
            <Breadcrumb items={[{ label: 'Settings', to: '/settings' }, { label: 'Profile' }]} />

            {message && (
                <div className={`mb-6 p-4 rounded-md flex items-center gap-3 shadow-sm border ${message.type === 'success' ? 'bg-green-50/80 border-green-100 text-green-700' : 'bg-red-50/80 border-red-100 text-red-700'}`}>
                    {message.type === 'success' ? <Check size={20} className="text-[#00C853]" /> : <X size={20} className="text-red-500" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Profile Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-[19px] font-bold text-gray-900 tracking-tight">Profile</h2>
                        <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed max-w-2xl">
                            Manage your user profile and contact details within Clustox ATS here.
                        </p>
                    </div>

                    <div className="px-6 flex flex-col">

                        {/* Profile Picture Section */}
                        <div className="py-6 border-b border-gray-100 flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#00C853] to-emerald-400 text-white flex items-center justify-center font-bold text-2xl shadow-sm border-2 border-white ring-1 ring-gray-100 object-cover overflow-hidden flex-shrink-0">
                                {user?.avatar_url ? (
                                    <img src={`http://localhost:8000${user.avatar_url}?t=${avatarCacheBust}`} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(user?.full_name)
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-gray-900">Profile Picture</h3>
                                <p className="text-sm text-gray-500 mb-3">We support PNGs, JPEGs under 10MB</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleAvatarClick}
                                        disabled={saving}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853] transition-colors"
                                    >
                                        <Camera size={16} className="mr-2 text-gray-400" />
                                        Upload Picture
                                    </button>
                                    {user?.avatar_url && (
                                        <button
                                            onClick={handleRemoveAvatar}
                                            disabled={saving}
                                            className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-red-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 size={16} className="mr-2" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                        </div>

                        <ProfileRow
                            label="Full Name"
                            fieldName="full_name"
                            value={user?.full_name || '-'}
                        />
                        <ProfileRow
                            label="Display Name"
                            fieldName="display_name"
                            value={user?.display_name || '-'}
                        />
                        <ProfileRow
                            label="Role"
                            fieldName="role"
                            value={(user?.role || '').replace('_', ' ')}
                            isEditable={false} // Users usually can't change their own role here
                            customValue={<span className="capitalize">{user?.role?.replace('_', ' ')}</span>}
                        />
                        <ProfileRow
                            label="Email Address"
                            fieldName="email"
                            value={user?.email || '-'}
                            type="email"
                        />
                        <ProfileRow
                            label="Phone Number"
                            fieldName="phone"
                            value={user?.phone || '-'}
                            type="tel"
                        />
                        <ProfileRow
                            label="Location"
                            fieldName="location"
                            value={user?.location || '-'}
                        />
                    </div>
                </div>

                {/* Calendar Integration Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                        <div>
                            <h2 className="text-[19px] font-bold text-gray-900 tracking-tight">Calendar Integration</h2>
                            <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed max-w-2xl">
                                Connect your Google Calendar to sync scheduled activities and check availability.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user?.google_access_token ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Google Calendar</h3>
                                <p className="text-xs text-gray-500">
                                    {user?.google_access_token ? 'Connected and syncing' : 'Not connected'}
                                </p>
                            </div>
                        </div>

                        <div>
                            {user?.google_access_token ? (
                                <button
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            // The backend endpoint isn't wired to frontend api/users.js yet, so we'll do a direct fetch or axios call here
                                            const token = localStorage.getItem('token');
                                            const res = await fetch('http://localhost:8000/api/calendar/disconnect', {
                                                method: 'DELETE',
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                                setUser({ ...user, google_access_token: null });
                                                setMessage({ type: 'success', text: 'Google Calendar disconnected.' });
                                            }
                                        } catch (err) {
                                            setMessage({ type: 'error', text: 'Failed to disconnect calendar.' });
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    className="px-4 py-2 bg-white border border-gray-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition shadow-sm"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        const token = localStorage.getItem('token');
                                        // Store token or state if needed, but the backend handles it via JWT cookie or current_user
                                        // The backend requires current_user, so we should actually hit an endpoint that returns the URL
                                        window.location.href = `http://localhost:8000/api/calendar/authorize?token=${token}`;
                                    }}
                                    className="px-4 py-2 bg-[#00C853] text-white rounded-md text-sm font-medium hover:bg-green-700 transition shadow-sm"
                                >
                                    Connect
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Password Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-[19px] font-bold text-gray-900 tracking-tight">Password</h2>
                        <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed max-w-2xl">
                            Use one of the options below to update your password.
                        </p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {/* Option 1: Email reset */}
                        <div className="px-6 py-5 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">Send Reset Email</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Works if you have a real email address. A secure link will be sent — valid for 1 hour.
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        setSaving(true);
                                        setResetMessage(null);
                                        try {
                                            await client.post('/forgot-password', { email: user.email });
                                            setResetMessage({ type: 'success', text: `Reset link sent to ${user.email}` });
                                            setTimeout(() => setResetMessage(null), 5000);
                                        } catch (err) {
                                            const errorMsg = err.response?.data?.detail || 'Failed to send reset email.';
                                            setResetMessage({ type: 'error', text: errorMsg });
                                            setTimeout(() => setResetMessage(null), 5000);
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={saving}
                                    className="flex-shrink-0 px-4 py-2 bg-[#00C853] text-white rounded-md text-sm font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {saving ? 'Sending…' : 'Send Link'}
                                </button>
                            </div>
                            {resetMessage && (
                                <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    {resetMessage.type === 'success' ? <Check size={16} /> : <X size={16} />}
                                    <span>{resetMessage.text}</span>
                                </div>
                            )}
                        </div>

                        {/* Option 2: In-app change */}
                        <div className="px-6 py-5">
                            <div className="flex items-start justify-between gap-4 mb-0">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">Change Password Here</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Works for all accounts. Requires your current password.
                                    </p>
                                </div>
                                {editingField !== 'password' && (
                                    <button
                                        onClick={() => setEditingField('password')}
                                        className="flex-shrink-0 text-sm font-semibold text-[#00C853] hover:text-green-700 transition-colors"
                                    >
                                        Change
                                    </button>
                                )}
                            </div>

                            {editingField === 'password' && (
                                <form onSubmit={handlePasswordSubmit} className="mt-4 max-w-sm space-y-3">
                                    <div className="relative">
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Current Password</label>
                                        <input
                                            name="current_password"
                                            type={showCurrentPw ? 'text' : 'password'}
                                            value={formData.current_password}
                                            onChange={handleChange}
                                            autoFocus
                                            required
                                            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] bg-white shadow-sm"
                                        />
                                        <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600">
                                            {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">New Password</label>
                                        <input
                                            name="new_password"
                                            type={showNewPw ? 'text' : 'password'}
                                            value={formData.new_password}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] bg-white shadow-sm"
                                        />
                                        <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600">
                                            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Confirm New Password</label>
                                        <input
                                            name="confirm_password"
                                            type="password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] bg-white shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            type="submit"
                                            disabled={saving || !formData.new_password || !formData.current_password}
                                            className="px-4 py-2 bg-[#00C853] text-white rounded-md text-sm font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                                        >
                                            {saving ? 'Updating…' : 'Update Password'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingField(null); setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' })); }}
                                            disabled={saving}
                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition shadow-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
