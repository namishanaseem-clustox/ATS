import React from 'react';
import { History, FilePlus, Edit, Copy, Archive, Layers, CheckCircle, AlertCircle } from 'lucide-react';

const JobActivityLog = ({ activities }) => {
    if (!activities || activities.length === 0) {
        return <p className="text-gray-500 text-sm italic">No audit logs recorded.</p>;
    }

    // Sort activities by timestamp desc
    const sortedActivities = [...activities].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    const formatTimestamp = (isoString) => {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getActionConfig = (activity) => {
        switch (activity.action_type) {
            case 'CREATED':
                return {
                    icon: <FilePlus size={16} className="text-green-600" />,
                    bg: 'bg-green-100',
                    text: `Job created with title "${activity.details?.title}"`
                };
            case 'UPDATED':
                const changes = Object.keys(activity.details || {}).map(key => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const oldVal = activity.details[key].old;
                    const newVal = activity.details[key].new;
                    // Truncate long values
                    const formatVal = (v) => String(v).length > 20 ? String(v).substring(0, 20) + '...' : String(v);

                    if (key === 'status') {
                        return `changed status from ${oldVal} to ${newVal}`;
                    }
                    return `updated ${label}`;
                }).join(', ');
                return {
                    icon: <Edit size={16} className="text-blue-600" />,
                    bg: 'bg-blue-100',
                    text: changes || 'Job details updated'
                };
            case 'CLONED_FROM':
                return {
                    icon: <Copy size={16} className="text-purple-600" />,
                    bg: 'bg-purple-100',
                    text: 'Job cloned from another requisition'
                };
            case 'ARCHIVED':
                return {
                    icon: <Archive size={16} className="text-red-600" />,
                    bg: 'bg-red-100',
                    text: 'Job archived'
                };
            case 'PIPELINE_UPDATED':
                return {
                    icon: <Layers size={16} className="text-orange-600" />,
                    bg: 'bg-orange-100',
                    text: 'Hiring pipeline configuration updated'
                };
            default:
                return {
                    icon: <History size={16} className="text-gray-600" />,
                    bg: 'bg-gray-100',
                    text: activity.action_type
                };
        }
    };

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {sortedActivities.map((activity, idx) => {
                    const config = getActionConfig(activity);
                    const isLast = idx === sortedActivities.length - 1;

                    return (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {!isLast && (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                                )}
                                <div className="relative flex space-x-3">
                                    <div className={`h-8 w-8 rounded-full ${config.bg} flex items-center justify-center ring-8 ring-white`}>
                                        {config.icon}
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm text-gray-900 break-words">
                                                {config.text}
                                            </p>

                                            {/* Detailed Changes for Updated/Pipeline */}
                                            {activity.action_type === 'UPDATED' && activity.details && (
                                                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                                    {Object.entries(activity.details).map(([key, vals]) => (
                                                        <div key={key} className="flex flex-col sm:flex-row sm:gap-2 mb-1 last:mb-0">
                                                            <span className="font-semibold capitalize w-32">{key.replace(/_/g, ' ')}:</span>
                                                            <div className="flex gap-2">
                                                                <span className="text-red-500 line-through opacity-70">{String(vals.old)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="text-green-600 font-medium">{String(vals.new)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                            {formatTimestamp(activity.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default JobActivityLog;
