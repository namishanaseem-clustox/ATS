import React from 'react';
import { Check, X, Shield } from 'lucide-react';

const PermissionRow = ({ feature, owner, hr, manager, interviewer }) => (
    <tr className="hover:bg-gray-50 transition-colors group bg-white border-b border-gray-100 last:border-0">
        <td className="px-4 py-3.5 whitespace-nowrap text-[13px] font-medium text-gray-900">{feature}</td>
        <td className="px-4 py-3.5 whitespace-nowrap text-center">{owner ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
        <td className="px-4 py-3.5 whitespace-nowrap text-center">{hr ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
        <td className="px-4 py-3.5 whitespace-nowrap text-center">{manager ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
        <td className="px-4 py-3.5 whitespace-nowrap text-center">{interviewer ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}</td>
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
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                                <th className="px-4 py-4 w-1/3">Feature / Access</th>
                                <th className="px-4 py-4 text-center">Owner</th>
                                <th className="px-4 py-4 text-center">HR</th>
                                <th className="px-4 py-4 text-center">Hiring Manager</th>
                                <th className="px-4 py-4 text-center">Interviewer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                            <tr className="bg-gray-50/50"><td colSpan="5" className="px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50">Organization Management</td></tr>
                            <PermissionRow feature="Manage Company Settings" owner={true} hr={false} manager={false} interviewer={false} />


                            <tr className="bg-gray-50/50"><td colSpan="5" className="px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-t border-gray-100">User Management</td></tr>
                            <PermissionRow feature="Invite / Create Users" owner={true} hr={true} manager={false} interviewer={false} />
                            <PermissionRow feature="Manage User Roles" owner={true} hr={true} manager={false} interviewer={false} />
                            <PermissionRow feature="Delete Users" owner={true} hr={true} manager={false} interviewer={false} />

                            <tr className="bg-gray-50/50"><td colSpan="5" className="px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Recruitment</td></tr>
                            <PermissionRow feature="Create / Edit Jobs" owner={true} hr={true} manager={true} interviewer={false} />
                            <PermissionRow feature="Publish Jobs" owner={true} hr={true} manager={true} interviewer={false} />
                            <PermissionRow feature="View All Candidates" owner={true} hr={true} manager={false} interviewer={false} />
                            <PermissionRow feature="View Assigned Candidates" owner={true} hr={true} manager={true} interviewer={true} />
                            <PermissionRow feature="Move Candidates (Pipeline)" owner={true} hr={true} manager={true} interviewer={false} />

                            <tr className="bg-gray-50/50"><td colSpan="5" className="px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-t border-gray-100">Interviews & Privacy</td></tr>
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
