import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';

const UserProfileDropdown = () => {
    const { user, logout, avatarCacheBust } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const isAdminOrHR = ['owner', 'hr'].includes(user?.role);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate('/login');
    };

    return (
        <div className="relative ml-4" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-[#00C853] to-emerald-400 text-white font-semibold text-sm shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C853] overflow-hidden"
                title={user?.full_name || 'User Profile'}
            >
                {user?.avatar_url ? (
                    <img src={`http://localhost:8000${user.avatar_url}?t=${avatarCacheBust}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    getInitials(user?.full_name)
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right">

                    {/* User Profile Section */}
                    <div className="p-3 border-b border-gray-50 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-tr from-[#00C853] to-emerald-400 text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
                                {user?.avatar_url ? (
                                    <img src={`http://localhost:8000${user.avatar_url}?t=${avatarCacheBust}`} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(user?.full_name)
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                    {user?.full_name || 'Current User'}
                                </p>
                                <Link
                                    to="/settings"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-0.5 leading-tight"
                                >
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Company Section */}
                    <div className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-md bg-[#00C853]/10 text-[#00C853] flex items-center justify-center font-bold text-xs">
                                C
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                                    Clustox
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate leading-tight">
                                    ID: {user?.id || '19813'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Links Section */}
                    <div className="py-1">
                        {isAdminOrHR && (
                            <Link
                                to="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                                <ShieldCheck size={18} className="text-gray-400" />
                                Administration
                            </Link>
                        )}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                            <LogOut size={18} className="text-gray-400 group-hover:text-red-500" />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;
