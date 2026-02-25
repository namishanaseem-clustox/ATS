import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Briefcase, Users, Building2,
    UsersRound, LogOut, PanelLeftClose, PanelLeftOpen,
    CalendarCheck, ShieldCheck, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Clustox Logo Black_Artboard 1.png';

const NavItem = ({ to, icon: Icon, label, badge, collapsed }) => (
    <NavLink
        to={to}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group ${isActive
                ? 'bg-[#00C853]/10 text-[#00C853]'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`
        }
    >
        <Icon size={16} className="flex-shrink-0" />
        {!collapsed && (
            <span className="flex-1 truncate">{label}</span>
        )}
        {!collapsed && badge > 0 && (
            <span className="bg-[#00C853] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </NavLink>
);

const SectionLabel = ({ label, collapsed }) => {
    if (collapsed) return <div className="my-2 border-t border-gray-100 mx-2" />;
    return (
        <p className="px-3 pt-5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest select-none">
            {label}
        </p>
    );
};

const Sidebar = ({ collapsed, onToggle }) => {
    const { user, logout } = useAuth();

    const isInterviewer = user?.role === 'interviewer';
    const isAdminOrHR = ['owner', 'hr'].includes(user?.role);

    return (
        <aside
            className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[60px]' : 'w-[220px]'
                }`}
        >
            {/* Logo area */}
            <div className={`flex items-center border-b border-gray-100 h-[56px] px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {collapsed ? (
                    <button
                        onClick={onToggle}
                        className="flex items-center justify-center w-8 h-8 bg-[#00C853] rounded-lg flex-shrink-0 hover:bg-[#00b34a] transition-colors"
                        title="Expand sidebar"
                    >
                        <span className="text-white font-bold text-sm leading-none">C</span>
                    </button>
                ) : (
                    <>
                        <div className="flex items-center gap-2 min-w-0">
                            <img src={logo} alt="Clustox" className="h-6 w-auto flex-shrink-0" />
                            <span className="font-semibold text-gray-700 text-xs tracking-wide uppercase">ATS</span>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                            title="Collapse sidebar"
                        >
                            <PanelLeftClose size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                <SectionLabel label="My Work" collapsed={collapsed} />
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Home" collapsed={collapsed} />
                <NavItem to="/tasks" icon={CalendarCheck} label="Activities" collapsed={collapsed} />

                <SectionLabel label="Recruitment" collapsed={collapsed} />
                {!isInterviewer && (
                    <NavItem to="/requisitions" icon={UsersRound} label="Requisitions" collapsed={collapsed} />
                )}
                <NavItem to="/jobs" icon={Briefcase} label="Jobs" collapsed={collapsed} />
                {!isInterviewer && !isAdminOrHR && (
                    <NavItem to="/candidates" icon={Users} label="Candidates" collapsed={collapsed} />
                )}

                {!isInterviewer && !isAdminOrHR && (
                    <>
                        <SectionLabel label="Organization" collapsed={collapsed} />
                        <NavItem to="/departments" icon={Building2} label="Departments" collapsed={collapsed} />
                    </>
                )}
            </nav>

            {/* Bottom actions */}
            <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
                {isAdminOrHR && (
                    <NavItem to="/admin" icon={ShieldCheck} label="Administration" collapsed={collapsed} />
                )}
                <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />

                {/* User row */}
                <div className={`flex items-center mt-2 pt-2 border-t border-gray-50 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate leading-tight">{user?.display_name || user?.full_name}</p>
                            <p className="text-[11px] text-gray-400 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        title="Logout"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
