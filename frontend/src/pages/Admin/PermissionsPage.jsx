import React from 'react';
import { Check, X, Shield } from 'lucide-react';

const PermissionRow = ({ feature, owner, hr, manager, interviewer }) => (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4 text-sm font-medium text-gray-900">{feature}</td>
        <td className="py-3 px-4 text-center">{owner ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
        <td className="py-3 px-4 text-center">{hr ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
        <td className="py-3 px-4 text-center">{manager ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
        <td className="py-3 px-4 text-center">{interviewer ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
    </tr>
);

const PermissionsPage = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Shield className="text-blue-600" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
                    <p className="mt-1 text-sm text-gray-500">Overview of access rights for each role in the system.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Feature / Access</th>
                                <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                                <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">HR</th>
                                <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Hiring Manager</th>
                                <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Interviewer</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-gray-50/50"><td colSpan="5" className="py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Organization Management</td></tr>
                            <PermissionRow feature="Manage Company Settings" owner={true} hr={false} manager={false} interviewer={false} />


                            <tr className="bg-gray-50/50"><td colSpan="5" className="py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User Management</td></tr>
                            <PermissionRow feature="Invite / Create Users" owner={true} hr={true} manager={false} interviewer={false} />
                            <PermissionRow feature="Manage User Roles" owner={true} hr={true} manager={false} interviewer={false} />
                            <PermissionRow feature="Delete Users" owner={true} hr={true} manager={false} interviewer={false} />

                            <tr className="bg-gray-50/50"><td colSpan="5" className="py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Recruitment</td></tr>
                            <PermissionRow feature="Create / Edit Jobs" owner={true} hr={true} manager={true} interviewer={false} />
                            <PermissionRow feature="Publish Jobs" owner={true} hr={true} manager={true} interviewer={false} />
                            <PermissionRow feature="View All Candidates" owner={true} hr={true} manager={false} interviewer={false} />
                            <PermissionRow feature="View Assigned Candidates" owner={true} hr={true} manager={true} interviewer={true} />
                            <PermissionRow feature="Move Candidates (Pipeline)" owner={true} hr={true} manager={true} interviewer={false} />

                            <tr className="bg-gray-50/50"><td colSpan="5" className="py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Interviews & Privacy</td></tr>
                            <PermissionRow feature="Schedule Interviews" owner={true} hr={true} manager={true} interviewer={true} />
                            <PermissionRow feature="Submit Scorecards" owner={true} hr={true} manager={true} interviewer={true} />

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PermissionsPage;
