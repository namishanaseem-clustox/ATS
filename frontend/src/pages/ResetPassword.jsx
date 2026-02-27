import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.new_password !== formData.confirm_password) {
            setError('Passwords do not match.');
            return;
        }
        if (formData.new_password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:8000/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: formData.new_password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Reset failed.');
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
                    <p className="text-red-600 font-medium">Invalid reset link. Please request a new one.</p>
                    <Link to="/forgot-password" className="mt-4 inline-block text-sm text-[#00C853] hover:underline">Request reset link</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
                            <KeyRound size={22} className="text-[#00C853]" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 text-center">Set a new password</h1>
                        <p className="text-sm text-gray-500 text-center mt-2">Choose a strong password for your account.</p>
                    </div>

                    {success ? (
                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto">
                                <Check size={22} className="text-[#00C853]" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">Password updated! Redirecting to login…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">{error}</div>
                            )}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={formData.new_password}
                                    onChange={(e) => setFormData(p => ({ ...p, new_password: e.target.value }))}
                                    required
                                    autoFocus
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] focus:border-[#00C853]"
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-[30px] text-gray-400 hover:text-gray-600">
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={formData.confirm_password}
                                    onChange={(e) => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] focus:border-[#00C853]"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !formData.new_password || !formData.confirm_password}
                                className="w-full py-2.5 px-4 bg-[#00C853] hover:bg-green-700 text-white font-medium rounded-md text-sm transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Updating…' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
