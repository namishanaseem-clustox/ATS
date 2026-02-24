import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateInvite, registerInvitedUser } from '../api/users';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const AcceptInvitation = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [isValidating, setIsValidating] = useState(true);
    const [inviteData, setInviteData] = useState(null);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        full_name: '',
        password: '',
        confirm_password: '',
    });
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const data = await validateInvite(token);
                setInviteData(data);
            } catch (err) {
                setError(err.response?.data?.detail || "Invalid or expired invitation token.");
            } finally {
                setIsValidating(false);
            }
        };

        if (token) {
            checkToken();
        } else {
            setIsValidating(false);
            setError("No invitation token provided.");
        }
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        if (formData.password !== formData.confirm_password) {
            setSubmitError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setSubmitError("Password must be at least 6 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            await registerInvitedUser({
                token: token,
                full_name: formData.full_name,
                password: formData.password
            });
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setSubmitError(err.response?.data?.detail || "Failed to complete registration.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isValidating) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <Loader className="mx-auto h-12 w-12 text-[#00C853] animate-spin" />
                    <h2 className="mt-6 text-2xl font-extrabold text-gray-900">Validating Invitation...</h2>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Error</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00C853] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Return to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Registration Complete!</h2>
                        <p className="text-gray-600 mb-6">Your account has been successfully created. Redirecting you to the login page...</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-[#00C853] hover:text-green-700 font-medium"
                        >
                            Click here if you aren't redirected
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="bg-[#00C853] text-white p-3 rounded-xl shadow-lg">
                        <CheckCircle size={32} />
                    </div>
                </div>
                <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
                    Accept Invitation
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Welcome! You've been invited to join as <span className="font-semibold">{inviteData?.role?.replace('_', ' ')}</span>.
                </p>
                <p className="mt-1 text-center text-sm text-gray-500">
                    {inviteData?.email}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {submitError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative text-sm">
                                {submitError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Full Name
                            </label>
                            <div className="mt-1">
                                <input
                                    name="full_name"
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <div className="mt-1">
                                <input
                                    name="confirm_password"
                                    type="password"
                                    required
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00C853] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Complete Registration'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvitation;
