import React from 'react';
import { UserPlus, Briefcase, CalendarPlus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QuickActionsWidget = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isInterviewer = user?.role === 'interviewer';

    const actions = [
        {
            label: 'Add Candidate',
            icon: <UserPlus size={20} className="mb-2 text-blue-600 group-hover:scale-110 transition-transform" />,
            onClick: () => navigate('/candidates'), // Since add candidate is a modal on candidates page usually, or a specific route
            color: 'bg-blue-50 hover:bg-blue-100 border-blue-100',
            show: !isInterviewer
        },
        {
            label: 'Create Job Post',
            icon: <Briefcase size={20} className="mb-2 text-purple-600 group-hover:scale-110 transition-transform" />,
            onClick: () => navigate('/jobs/new'),
            color: 'bg-purple-50 hover:bg-purple-100 border-purple-100',
            show: !isInterviewer && user?.role !== 'hiring_manager'
        },
        {
            label: 'Schedule Interview',
            icon: <CalendarPlus size={20} className="mb-2 text-[#00C853] group-hover:scale-110 transition-transform" />,
            onClick: () => navigate('/tasks'), // Usually triggers the activity modal
            color: 'bg-green-50 hover:bg-green-100 border-green-100',
            show: !isInterviewer
        },
        {
            label: 'New Requisition',
            icon: <FileText size={20} className="mb-2 text-orange-600 group-hover:scale-110 transition-transform" />,
            onClick: () => navigate('/requisitions/new'),
            color: 'bg-orange-50 hover:bg-orange-100 border-orange-100',
            show: !isInterviewer
        }
    ].filter(a => a.show);

    if (actions.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">QUICK ACTIONS</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={action.onClick}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${action.color}`}
                    >
                        {action.icon}
                        <span className="text-sm font-semibold text-gray-700">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActionsWidget;
