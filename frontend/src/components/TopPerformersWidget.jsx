import React, { useState } from 'react';
import { UserCheck, Users, Briefcase, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTopPerformers } from '../api/dashboard';

const PREVIEW_COUNT = 3;

const TopPerformersWidget = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [expandHires, setExpandHires] = useState(false);
    const [expandCandidates, setExpandCandidates] = useState(false);
    const [expandJobs, setExpandJobs] = useState(false);
    const [expandActions, setExpandActions] = useState(false);
    const [timeframe, setTimeframe] = useState('this_month');

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['top-performers', timeframe],
        queryFn: getTopPerformers,
    });

    const isRefreshing = isFetching;
    const topData = data || { hires: [], candidates: [], jobs: [], actions: [] };

    const RankBadge = ({ rank }) => {
        const bg = rank === 1 ? 'bg-[#007BFF]' : rank === 2 ? 'bg-[#00C853]' : 'bg-[#00BCD4]';
        const label = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
        return (
            <div className={`absolute -top-1.5 -right-1.5 ${bg} text-white text-[9px] font-bold px-1 py-0.5 rounded-md shadow-sm z-10 leading-none`}>
                {label}
            </div>
        );
    };

    const UserAvatar = ({ id, name, count, label, isMe, rank }) => {
        const initial = name ? name[0].toUpperCase() : 'U';
        return (
            <div className="flex flex-col items-center justify-center p-2 relative">
                <div className="relative mb-2">
                    <div className="w-[42px] h-[42px] rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                        <div className={`w-full h-full flex items-center justify-center font-bold text-white ${isMe ? 'bg-gray-800' : 'bg-gray-400'}`}>
                            {initial}
                        </div>
                    </div>
                    {rank && <RankBadge rank={rank} />}
                </div>
                <span
                    onClick={() => navigate('/admin/team')}
                    className={`text-[11px] truncate w-20 text-center cursor-pointer hover:underline ${isMe ? 'text-blue-600 font-semibold' : 'text-blue-500'}`}
                >
                    {isMe ? 'You' : name}
                </span>
                <span className="text-[10px] text-gray-400">{count} {label}</span>
            </div>
        );
    };

    const Section = ({ title, items, label, expanded, onToggle }) => {
        const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
        const hasMore = items.length > PREVIEW_COUNT;
        return (
            <div className="flex items-center justify-start px-4 w-full gap-4 overflow-x-auto py-2">
                {visible.map((c, i) => (
                    <UserAvatar key={i} id={c.id} name={c.name} label={label} count={c.count} isMe={c.id === user?.id} rank={i + 1} />
                ))}
                {hasMore && (
                    <button
                        onClick={onToggle}
                        className="flex flex-col items-center justify-center p-2 text-blue-500 hover:text-blue-700 text-[11px] font-medium whitespace-nowrap"
                    >
                        <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center mb-2 text-blue-400 text-lg">
                            {expanded ? '−' : '+'}
                        </div>
                        {expanded ? 'View less' : `+${items.length - PREVIEW_COUNT} more`}
                    </button>
                )}
            </div>
        );
    };

    const SectionRow = ({ title, items, label, expanded, onToggle, emptyMsg, noBorder }) => (
        <div className={noBorder ? '' : 'border-b border-gray-100'}>
            <div className="flex justify-between items-center px-4 pt-4 mb-2">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center">
                    {title} <span className="ml-1 text-gray-300">℗</span>
                </h4>
                {items.length > PREVIEW_COUNT && (
                    <button
                        onClick={onToggle}
                        className="text-[11px] text-blue-600 font-medium hover:underline"
                    >
                        {expanded ? 'View less' : 'View more'}
                    </button>
                )}
            </div>
            <div className="flex items-center justify-center py-2 text-xs text-gray-400">
                {isLoading ? 'Loading...' : items.length > 0 ? (
                    <Section title={title} items={items} label={label} expanded={expanded} onToggle={onToggle} />
                ) : emptyMsg}
            </div>
        </div>
    );

    return (
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden w-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-900 text-[15px] uppercase tracking-wide">TOP PERFORMERS</h3>
                <div className="flex space-x-2 items-center">
                    <button
                        onClick={() => refetch()}
                        disabled={isRefreshing}
                        className={`text-xs border border-blue-600 text-blue-600 px-3 py-1.5 rounded bg-white hover:bg-blue-50 transition-colors font-medium flex items-center ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="mr-1">↻</span> {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="text-xs text-blue-600 border border-blue-200 px-2 py-1.5 rounded bg-white focus:outline-none cursor-pointer font-medium"
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="this_year">This Year</option>
                    </select>
                </div>
            </div>

            <div className={`p-0 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
                <SectionRow title="HIRES" items={topData.hires} label="hires" expanded={expandHires} onToggle={() => setExpandHires(e => !e)} emptyMsg="No users with hires found." />
                <SectionRow title="CANDIDATES" items={topData.candidates} label="candidates" expanded={expandCandidates} onToggle={() => setExpandCandidates(e => !e)} emptyMsg="No users with candidates found." />
                <SectionRow title="JOBS" items={topData.jobs} label="jobs" expanded={expandJobs} onToggle={() => setExpandJobs(e => !e)} emptyMsg="No users with jobs found." />
                <SectionRow title="ACTIONS TAKEN" items={topData.actions} label="Actions" expanded={expandActions} onToggle={() => setExpandActions(e => !e)} emptyMsg="No users with actions found." noBorder />
            </div>
        </div>
    );
};

export default TopPerformersWidget;
