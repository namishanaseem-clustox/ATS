import React from 'react';

const STATUS_COLORS = {
    'New': 'bg-blue-100 text-blue-800',
    'Shortlisted': 'bg-purple-100 text-purple-800',
    'Interview': 'bg-yellow-100 text-yellow-800',
    'Offer': 'bg-orange-100 text-orange-800',
    'Hired': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Withdrawn': 'bg-gray-100 text-gray-800',
};

const ApplicationStatusBadge = ({ status }) => {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colorClass}`}>
            {status}
        </span>
    );
};

export default ApplicationStatusBadge;
