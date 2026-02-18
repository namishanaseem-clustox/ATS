import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Briefcase, Users, Building2, UserCheck,
    ChevronDown, ChevronRight, UsersRound, LogOut, Menu, X,
    CalendarCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Clustox Logo Black_Artboard 1.png';

const NavGroup = ({ label, icon: Icon, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(() => {
        // Auto-open group if a child route is active
        return defaultOpen;
    });

    return (
        <div className="mb-1">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors rounded-md"
            >
                <span className="flex items-center gap-2">
                    <Icon size={14} />
                    {label}
                </span>
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {open && (
                <div className="ml-2 mt-0.5 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
};

const NavItem = ({ to, icon: Icon, label, badge }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all group ${isActive
                ? 'bg-[#00C853]/10 text-[#00C853]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
        }
    >
        <span className="flex items-center gap-3">
            <Icon size={16} />
            {label}
        </span>
        {badge > 0 && (
            <span className="bg-[#00C853] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </NavLink>
);

const Sidebar = ({ collapsed, onToggle }) => {
    const { user, logout } = useAuth();

    const isInterviewer = user?.role === 'interviewer';
    const isHiringManager = user?.role === 'hiring_manager';
    const isAdminOrHR = ['owner', 'hr'].includes(user?.role);

    return (
        <aside
            className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'
                }`}
        >
            {/* Logo + Toggle */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                {!collapsed && (
                    <div className="flex items-center gap-2 min-w-0">
                        <img src={logo} alt="Clustox" className="h-7 w-auto flex-shrink-0" />
                        <span className="font-bold text-gray-800 text-sm truncate">Clustox ATS</span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <Menu size={18} /> : <X size={18} />}
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {collapsed ? (
                    /* Collapsed: icon-only */
                    <div className="space-y-1">
                        <NavLink to="/dashboard" title="Dashboard"
                            className={({ isActive }) => `flex items-center justify-center p-2.5 rounded-md transition-colors ${isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <LayoutDashboard size={18} />
                        </NavLink>
                        <NavLink to="/jobs" title="Jobs"
                            className={({ isActive }) => `flex items-center justify-center p-2.5 rounded-md transition-colors ${isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <Briefcase size={18} />
                        </NavLink>
                        {!isInterviewer && (
                            <NavLink to="/candidates" title="Candidates"
                                className={({ isActive }) => `flex items-center justify-center p-2.5 rounded-md transition-colors ${isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'text-gray-500 hover:bg-gray-100'}`}>
                                <Users size={18} />
                            </NavLink>
                        )}
                        {!isInterviewer && (
                            <NavLink to="/departments" title="Departments"
                                className={({ isActive }) => `flex items-center justify-center p-2.5 rounded-md transition-colors ${isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'text-gray-500 hover:bg-gray-100'}`}>
                                <Building2 size={18} />
                            </NavLink>
                        )}
                        <NavLink to="/my-interviews" title="My Interviews"
                            className={({ isActive }) => `flex items-center justify-center p-2.5 rounded-md transition-colors ${isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <CalendarCheck size={18} />
                        </NavLink>
                        {isAdminOrHR && (
                            <NavLink to="/team" title="Team"
                                className={({ isActive }) => `flex items-center justify-center p-2.5 rounded-md transition-colors ${isActive ? 'bg-[#00C853]/10 text-[#00C853]' : 'text-gray-500 hover:bg-gray-100'}`}>
                                <UsersRound size={18} />
                            </NavLink>
                        )}
                    </div>
                ) : (
                    /* Expanded: grouped submenus */
                    <>
                        {/* My Work */}
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

                        {/* Recruitment group */}
                        <div className="pt-2">
                            <NavGroup label="Recruitment" icon={Briefcase} defaultOpen={true}>
                                <NavItem to="/jobs" icon={Briefcase} label="Jobs" />
                                {!isInterviewer && (
                                    <NavItem to="/candidates" icon={Users} label="Candidates" />
                                )}
                            </NavGroup>
                        </div>

                        {/* My Work group */}
                        <div className="pt-1">
                            <NavGroup label="My Work" icon={CalendarCheck} defaultOpen={true}>
                                <NavItem to="/my-interviews" icon={CalendarCheck} label="My Interviews" />
                            </NavGroup>
                        </div>

                        {/* Organization group — hidden for interviewers */}
                        {!isInterviewer && (
                            <div className="pt-1">
                                <NavGroup label="Organization" icon={Building2} defaultOpen={!isHiringManager}>
                                    <NavItem to="/departments" icon={Building2} label="Departments" />
                                    {isAdminOrHR && (
                                        <NavItem to="/team" icon={UsersRound} label="Team" />
                                    )}
                                </NavGroup>
                            </div>
                        )}
                    </>
                )}
            </nav>

            {/* User footer */}
            <div className="border-t border-gray-100 px-3 py-3">
                {collapsed ? (
                    <button
                        onClick={logout}
                        title="Logout"
                        className="w-full flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={16} />
                    </button>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                            <p className="text-xs text-gray-500 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <button
                            onClick={logout}
                            title="Logout"
                            className="ml-2 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
