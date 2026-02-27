import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Check } from 'lucide-react';
import client from '../api/client';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await client.post('/forgot-password', { email });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
                            <Mail size={22} className="text-[#00C853]" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 text-center">Forgot your password?</h1>
                        <p className="text-sm text-gray-500 text-center mt-2">
                            Enter your email and we'll send you a reset link.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto">
                                <Check size={22} className="text-[#00C853]" />
                            </div>
                            <p className="text-sm text-gray-700 font-medium">
                                If that email is registered, a reset link has been sent. Check your inbox.
                            </p>
                            <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">{error}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="you@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00C853] focus:border-[#00C853]"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full py-2.5 px-4 bg-[#00C853] hover:bg-green-700 text-white font-medium rounded-md text-sm transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Sending…' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                            <ArrowLeft size={14} />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
