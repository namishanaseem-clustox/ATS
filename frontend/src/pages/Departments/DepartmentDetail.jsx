import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartments } from '../../api/departments';
import { ArrowLeft, Users, Briefcase, User } from 'lucide-react';
import JobBoard from '../JobBoard';

const DepartmentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [department, setDepartment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDepartment = async () => {
            try {
                // Fetch all departments and find the one matching ID
                // Ideally backend should have getDepartment(id) endpoint
                const data = await getDepartments();
                const dept = data.find(d => d.id === id);
                setDepartment(dept);
            } catch (error) {
                console.error("Failed to fetch department", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDepartment();
    }, [id]);

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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium self-start ${department.status === 'Active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                        {department.status}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="flex items-center text-gray-600">
                        <User size={18} className="mr-3 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Owner</p>
                            <p className="font-medium">{department.owner_id || 'Unassigned'}</p>
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
                            <p className="font-medium">{department.total_members_count} Members</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embedded Job Board */}
            <div className="flex-1 overflow-hidden">
                <JobBoard embeddedDepartmentId={id} />
            </div>
        </div>
    );
};

export default DepartmentDetail;
