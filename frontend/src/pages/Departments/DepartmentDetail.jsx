import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartments, removeMemberFromDepartment, getDepartmentMembers } from '../../api/departments';
import { updateUser } from '../../api/users';
import { ArrowLeft, Users, Briefcase, User, X, Trash2 } from 'lucide-react';
import JobBoard from '../JobBoard';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../../components/ConfirmationModal';

const DepartmentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [department, setDepartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);

    // Modal state for removing member
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);

    // Permission check: Owner or HR only
    const canManageMembers = currentUser?.role === 'owner' ||
        currentUser?.role === 'hr';

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Department Details
                const departmentsData = await getDepartments();
                const dept = departmentsData.find(d => d.id === id);
                setDepartment(dept);

                // 2. Fetch Members (if dept exists)
                if (dept) {
                    try {
                        // Use the specific endpoint that allows Dept Owners to view members
                        const membersData = await getDepartmentMembers(id);
                        setMembers(membersData);
                    } catch (err) {
                        console.error("Failed to fetch members", err);
                        // Fallback or handle error (e.g., if user has no permission, members list remains empty)
                        setMembers([]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleRemoveClick = (member) => {
        setMemberToRemove(member);
        setIsRemoveModalOpen(true);
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;

        try {
            // Use specific endpoint for member removal (safe for Dept Owners)
            await removeMemberFromDepartment(id, memberToRemove.id);

            // Update local state
            setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));

            // Update department total count (optimistic update)
            setDepartment(prev => ({
                ...prev,
                total_members_count: Math.max(0, (prev.total_members_count || 0) - 1)
            }));

            setIsRemoveModalOpen(false);
            setMemberToRemove(null);
        } catch (error) {
            console.error("Failed to remove member", error);
            alert("Failed to remove member. Please try again.");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading department...</div>;
    if (!department) return <div className="p-8 text-center text-red-500">Department not found</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <button
                    onClick={() => navigate('/departments')}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-4"
                >
                    <ArrowLeft size={18} className="mr-2" /> Back to Departments
                </button>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{department.name}</h1>
                        <p className="text-gray-600 max-w-2xl">{department.description || "No description provided."}</p>
                    </div>
                    <span className={`px - 3 py - 1 rounded - full text - sm font - medium self - start ${department.status === 'Active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        } `}>
                        {department.status}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="flex items-center text-gray-600">
                        <User size={18} className="mr-3 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Owner</p>
                            <p className="font-medium">{department.owner ? department.owner.full_name : (department.owner_id || 'Unassigned')}</p>
                        </div>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <Briefcase size={18} className="mr-3 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Jobs</p>
                            <p className="font-medium">{department.total_jobs_count} Total ({department.active_jobs_count} Active)</p>
                        </div>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <Users size={18} className="mr-3 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Members</p>
                            <p className="font-medium">{members.length} Members</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area - Job Board */}
                <div className="flex-1 overflow-y-auto border-r border-gray-200">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Jobs</h3>
                        <JobBoard embeddedDepartmentId={id} />
                    </div>
                </div>

                {/* Sidebar - Members List */}
                <div className="w-80 bg-white overflow-y-auto hidden md:block">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                            <span>Team Members</span>
                            <span className="text-sm font-normal text-gray-500">{members.length}</span>
                        </h3>

                        {members.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                No members assigned.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {members.map(member => (
                                    <li key={member.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="flex items-center truncate">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                                                {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : 'U'}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-gray-900 truncate">{member.full_name || 'Unknown User'}</p>
                                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                                {/* <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{member.role.replace('_', ' ')}</span> */}
                                            </div>
                                        </div>

                                        {canManageMembers && (
                                            <button
                                                onClick={() => handleRemoveClick(member)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="Remove from Department"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {canManageMembers && (
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => navigate('/team')}
                                    className="w-full text-sm text-primary font-medium hover:underline text-center"
                                >
                                    Manage Team &rarr;
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isRemoveModalOpen}
                onClose={() => setIsRemoveModalOpen(false)}
                onConfirm={confirmRemoveMember}
                title="Remove Member"
                message={`Are you sure you want to remove ${memberToRemove?.full_name} from this department ? `}
                confirmText="Remove"
                confirmStyle="danger"
            />
        </div>
    );
};

export default DepartmentDetail;
