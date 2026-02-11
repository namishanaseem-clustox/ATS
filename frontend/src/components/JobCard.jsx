import React from 'react';
import { MapPin, Users, Briefcase } from 'lucide-react';

const JobCard = ({ job, onClick }) => {
    const statusColors = {
        'Published': 'bg-green-100 text-green-800 border-green-200',
        'Draft': 'bg-gray-100 text-gray-800 border-gray-200',
        'Closed': 'bg-red-100 text-red-800 border-red-200',
        'Archived': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer p-4 group"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#00C853] transition-colors">
                        {job.title}
                    </h3>
                    <span className="text-xs text-gray-500 font-mono">{job.job_code}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
                    {job.status}
                </span>
            </div>

            <div className="space-y-2 mt-4">
                <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    {job.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Briefcase size={16} className="mr-2 text-gray-400" />
                    {job.employment_type}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Users size={16} className="mr-2 text-gray-400" />
                    {job.headcount} Openings
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                </span>
                {job.department ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/jobs?dept=${job.department.id}`;
                        }}
                        className="text-xs font-medium text-[#00C853] bg-green-50 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                    >
                        {job.department.name}
                    </button>
                ) : job.department_id ? (
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        Dept: {job.department_id.slice(0, 8)}...
                    </span>
                ) : null}
            </div>
        </div>
    );
};

export default JobCard;
