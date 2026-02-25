import React, { useState, useEffect } from 'react';
import { Plus, User, Shield, Briefcase, Mail, Pencil, Building, Trash2, MoreVertical, Send, Search, Filter } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, inviteUser } from '../api/users';
import { getDepartments } from '../api/departments';
import RoleGuard from '../components/RoleGuard';
import CustomSelect from '../components/CustomSelect';

const ROLE_OPTIONS = [
    { value: 'interviewer', label: 'Interviewer' },
    { value: 'hiring_manager', label: 'Hiring Manager' },
    { value: 'hr', label: 'HR' },
    { value: 'owner', label: 'Owner' },
];

const STATUS_OPTIONS = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
];

const UserActions = ({ onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 focus:outline-none">
                    <div className="py-1">
                        <button
                            onClick={() => { setIsOpen(false); onEdit(); }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            <Pencil size={16} className="mr-2 text-indigo-500" />
                            Edit
                        </button>
                        <button
                            onClick={() => { setIsOpen(false); onDelete(); }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const Team = () => {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        role: 'interviewer',
        is_active: 'true',
        department_id: '',
    });
    const [inviteFormData, setInviteFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        role: 'interviewer',
        department_id: '',
    });
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersData, departmentsData] = await Promise.all([
                getUsers(),
                getDepartments()
            ]);
            setUsers(usersData);
            setDepartments(departmentsData);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInviteInputChange = (e) => {
        const { name, value } = e.target;
        setInviteFormData(prev => ({ ...prev, [name]: value }));
    };

    const openCreateModal = () => {
        setError(null);
        setIsEditing(false);
        setCurrentUserId(null);
        setFormData({
            full_name: '',
            email: '',
            phone: '',
            location: '',
            role: 'interviewer',
            is_active: 'true',
            department_id: '',
        });
        setIsModalOpen(true);
    };

    const openInviteModal = () => {
        setError(null);
        setSuccessMessage(null);
        setInviteFormData({
            full_name: '',
            email: '',
            phone: '',
            location: '',
            role: 'interviewer',
            department_id: '',
        });
        setIsInviteModalOpen(true);
    };

    const openEditModal = (user) => {
        setError(null);
        setIsEditing(true);
        setCurrentUserId(user.id);
        setFormData({
            full_name: user.full_name,
            email: user.email,
            phone: user.phone || '',
            location: user.location || '',
            role: user.role,
            is_active: user.is_active ? 'true' : 'false',
            department_id: user.department_id || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (isEditing) {
                const dataToSend = { ...formData };

                // Convert is_active string to boolean
                dataToSend.is_active = dataToSend.is_active === 'true';

                // Handle empty department_id
                if (dataToSend.department_id === '') dataToSend.department_id = null;

                await updateUser(currentUserId, dataToSend);
            } else {
                const dataToSend = { ...formData };
                // Handle empty department_id
                if (dataToSend.department_id === '') dataToSend.department_id = null;

                // For creation, is_active is assumed true by backend
                await createUser(dataToSend);
            }

            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error(isEditing ? "Failed to update user" : "Failed to create user", err);
            setError(err.response?.data?.detail || "Operation failed");
        }
    };

    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        try {
            const dataToSend = { ...inviteFormData };
            if (dataToSend.department_id === '') dataToSend.department_id = null;

            await inviteUser(dataToSend);
            setSuccessMessage(`Invitation successfully sent to ${inviteFormData.email}`);
            setTimeout(() => {
                setIsInviteModalOpen(false);
                setSuccessMessage(null);
            }, 2500);
        } catch (err) {
            console.error("Failed to send invitation", err);
            setError(err.response?.data?.detail || "Failed to send invitation");
        }
    };

    const handleDelete = async (user) => {
        if (window.confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
            try {
                await deleteUser(user.id);
                fetchUsers();
            } catch (err) {
                console.error("Failed to delete user", err);
                alert(err.response?.data?.detail || "Failed to delete user");
            }
        }
    };

    const getDepartmentName = (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : '-';
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading team...</div>;

    const departmentOptions = [
        { value: '', label: 'No Department' },
        ...departments.map(dept => ({ value: dept.id, label: dept.name }))
    ];

    const filteredUsers = users.filter((user) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (user.full_name || '').toLowerCase().includes(query) || (user.email || '').toLowerCase().includes(query) || (user.role || '').toLowerCase().includes(query);
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-gray-500 mt-1">Manage your team members and their roles.</p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search team members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm transition-all w-80 shadow-sm"
                        />
                    </div>

                    <button
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                    <RoleGuard allowedRoles={['owner', 'hr']}>
                        <div className="flex gap-3">
                            <button
                                onClick={openCreateModal}
                                className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Plus size={16} className="mr-2" />
                                Direct Add
                            </button>
                            <button
                                onClick={openInviteModal}
                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
                            >
                                <Send size={16} className="mr-2" />
                                Invite User
                            </button>
                        </div>
                    </RoleGuard>
                    <div className="text-sm text-gray-500">
                        Results: <span className="font-semibold text-gray-700">{filteredUsers.length}</span>
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-white border-b border-gray-200 text-xs text-black font-bold uppercase tracking-wide">
                                <th className="px-4 py-4 w-1/3">Member</th>
                                <th className="px-4 py-4">Role</th>
                                <th className="px-4 py-4">Department</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-[13px]">
                            {filteredUsers.map((user, index) => {
                                const isEven = index % 2 === 0;
                                return (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors group ${isEven ? 'bg-white' : 'bg-[#fafafa]'}`}>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                        <User size={20} />
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-[13px] font-medium text-gray-900">{user.full_name}</div>
                                                    <div className="text-[13px] text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                                {user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <div className="flex flex-col text-[13px]">
                                                {user.managed_departments && user.managed_departments.length > 0 && (
                                                    <div className="flex items-center text-gray-700 font-medium" title="Manages">
                                                        <Shield size={12} className="mr-1" />
                                                        {user.managed_departments.map(d => d.name).join(", ")}
                                                    </div>
                                                )}
                                                {user.department_id && (!user.managed_departments || !user.managed_departments.some(d => d.id === user.department_id)) && (
                                                    <div className="flex items-center text-gray-500 mt-0.5" title="Member of">
                                                        <User size={12} className="mr-1" />
                                                        {getDepartmentName(user.department_id)}
                                                    </div>
                                                )}
                                                {(!user.managed_departments || user.managed_departments.length === 0) && !user.department_id && (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                                            <RoleGuard allowedRoles={['owner', 'hr']}>
                                                <UserActions
                                                    onEdit={() => openEditModal(user)}
                                                    onDelete={() => handleDelete(user)}
                                                />
                                            </RoleGuard>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Member Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsInviteModalOpen(false)}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
                            <form onSubmit={handleInviteSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Invite New User</h3>
                                    <p className="text-sm text-gray-500 mb-4">Send an email invitation allowing a new member to set their own password and join the platform.</p>

                                    {error && (
                                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                                            <span className="block sm:inline">{error}</span>
                                        </div>
                                    )}

                                    {successMessage && (
                                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
                                            <span className="block sm:inline">{successMessage}</span>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                            <input
                                                type="text"
                                                name="full_name"
                                                value={inviteFormData.full_name}
                                                onChange={handleInviteInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                                placeholder="John Doe"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={inviteFormData.email}
                                                onChange={handleInviteInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                                placeholder="colleague@clustox.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                                            <input
                                                type="text"
                                                name="phone"
                                                value={inviteFormData.phone}
                                                onChange={handleInviteInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                                placeholder="+1234567890"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Location</label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={inviteFormData.location}
                                                onChange={handleInviteInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                                placeholder="City, Country"
                                            />
                                        </div>

                                        <CustomSelect
                                            label="Role"
                                            name="role"
                                            options={ROLE_OPTIONS}
                                            value={inviteFormData.role}
                                            onChange={handleInviteInputChange}
                                        />

                                        <CustomSelect
                                            label="Department"
                                            name="department_id"
                                            options={departmentOptions}
                                            value={inviteFormData.department_id}
                                            onChange={handleInviteInputChange}
                                        />
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                                    <button
                                        type="submit"
                                        disabled={!!successMessage}
                                        className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#00C853] text-base font-medium text-white hover:bg-green-700 focus:outline-none disabled:bg-green-300 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        <Send size={16} className="mr-2" />
                                        Send Invite
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing Add/Edit Member Modal (Direct Add) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{isEditing ? 'Edit Member' : 'Direct Add Member'}</h3>

                                    {error && (
                                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                                            <span className="block sm:inline">{error}</span>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                            <input
                                                type="text"
                                                name="full_name"
                                                required
                                                value={formData.full_name}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Location</label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm"
                                            />
                                        </div>


                                        <CustomSelect
                                            label="Role"
                                            name="role"
                                            options={ROLE_OPTIONS}
                                            value={formData.role}
                                            onChange={handleInputChange}
                                        />

                                        <CustomSelect
                                            label="Department"
                                            name="department_id"
                                            options={departmentOptions}
                                            value={formData.department_id}
                                            onChange={handleInputChange}
                                        />

                                        {isEditing && (
                                            <CustomSelect
                                                label="Status"
                                                name="is_active"
                                                options={STATUS_OPTIONS}
                                                value={formData.is_active}
                                                onChange={handleInputChange}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#00C853] text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        {isEditing ? 'Save Changes' : 'Add Member'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Team;
