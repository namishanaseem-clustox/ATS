import React from 'react';
import { Link } from 'react-router-dom';
import {
    UsersRound, FileText, Building2, KanbanSquare, ShieldCheck, ChevronRight, Users
} from 'lucide-react';

const AdminCard = ({ to, icon: Icon, title, description }) => (
    <Link to={to} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-[#00C853] hover:shadow-md transition-all group">
        <div className="flex items-start justify-between">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-[#00C853]/10 transition-colors">
                <Icon className="text-blue-600 group-hover:text-[#00C853] transition-colors" size={24} />
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-[#00C853] transition-colors" size={20} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-[#00C853] transition-colors">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
    </Link>
);

const AdminPage = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
                <p className="mt-1 text-sm text-gray-500">Manage your organization settings, users, and hiring process.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AdminCard
                    to="/admin/team"
                    icon={UsersRound}
                    title="Team Management"
                    description="Add users, assign roles, and manage department access."
                />
                <AdminCard
                    to="/admin/candidates"
                    icon={Users}
                    title="Candidates"
                    description="Manage candidate profiles, add new applicants, and remove records."
                />
                <AdminCard
                    to="/admin/scorecards"
                    icon={FileText}
                    title="Scorecard Templates"
                    description="Create and manage interview evaluation criteria templates."
                />
                <AdminCard
                    to="/admin/departments"
                    icon={Building2}
                    title="Departments"
                    description="Configure your organization structure and departments."
                />
                <AdminCard
                    to="/admin/pipeline"
                    icon={KanbanSquare}
                    title="Pipeline Stages"
                    description="Customize the hiring pipeline stages and workflow."
                />
                <AdminCard
                    to="/admin/permissions"
                    icon={ShieldCheck}
                    title="Roles & Permissions"
                    description="View access rights for different user roles."
                />
            </div>
        </div>
    );
};

export default AdminPage;
