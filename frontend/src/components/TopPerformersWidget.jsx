import React, { useState } from 'react';
import { UserCheck, Users, Briefcase, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TopPerformersWidget = () => {
    const { user } = useAuth();

    // State for expanding sections
    const [expandHires, setExpandHires] = useState(false);
    const [expandCandidates, setExpandCandidates] = useState(false);
    const [expandActions, setExpandActions] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState('this_month');

    const handleRefresh = () => {
        setIsRefreshing(true);
        // Simulate network request
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const getMultiplier = () => {
        switch (timeframe) {
            case 'today': return 0.1;
            case 'this_week': return 0.25;
            case 'this_year': return 12;
            case 'this_month':
            default: return 1;
        }
    };

    const m = getMultiplier();

    // Mock Colleagues Data
    const colleagues = [
        { name: 'Jane Doe', hires: Math.ceil(2 * m), candidates: Math.ceil(5 * m), actions: Math.ceil(10 * m), bg: 'bg-green-100', text: 'text-green-700' },
        { name: 'Josh Smith', hires: Math.ceil(1 * m), candidates: Math.ceil(8 * m), actions: Math.ceil(22 * m), bg: 'bg-purple-100', text: 'text-purple-700' },
        { name: 'Ben Stokes', hires: 0, candidates: Math.ceil(3 * m), actions: Math.ceil(5 * m), bg: 'bg-orange-100', text: 'text-orange-700' }
    ];

    const myStats = {
        hires: Math.ceil(0 * m), // always 0 based on original mock
        candidates: Math.ceil(12 * m),
        actions: Math.ceil(16 * m)
    };

    const RankBadge = ({ rank }) => {
        const bg = rank === '1st' || rank === 1 ? 'bg-[#007BFF]' : rank === '2nd' || rank === 2 ? 'bg-[#00C853]' : 'bg-[#00BCD4]';
        const displayRank = typeof rank === 'number' ? `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : 'rd'}` : rank;
        return (
            <div className={`absolute -top-1.5 -right-1.5 ${bg} text-white text-[9px] font-bold px-1 py-0.5 rounded-md shadow-sm z-10 leading-none`}>
                {displayRank}
            </div>
        );
    };

    const UserAvatar = ({ name, count, label, isMe, rank }) => {
        const initial = name ? name[0].toUpperCase() : 'U';
        return (
            <div className="flex flex-col items-center justify-center p-2 relative">
                <div className="relative mb-2">
                    <div className="w-[42px] h-[42px] rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                        {/* We use initials or an image. Since we don't have images for mock, we use nice bg */}
                        <div className={`w-full h-full flex items-center justify-center font-bold text-white ${isMe ? 'bg-gray-800' : 'bg-gray-400'}`}>
                            {initial}
                        </div>
                    </div>
                    {rank && <RankBadge rank={rank} />}
                </div>
                <span className={`text-[11px] truncate w-20 text-center ${isMe ? 'text-blue-600 font-semibold' : 'text-blue-500 hover:underline cursor-pointer'}`}>
                    {isMe ? 'You' : name}
                </span>
                <span className="text-[10px] text-gray-400">{count} {label}</span>
            </div>
        );
    };

    return (
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden w-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-900 text-[15px] uppercase tracking-wide">TOP PERFORMERS</h3>
                <div className="flex space-x-2 items-center">
                    <button
                        onClick={handleRefresh}
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
                        <option value="this_month">2/1/2026 - 2/28/2026</option>
                        <option value="this_week">This Week</option>
                        <option value="today">Today</option>
                        <option value="this_year">This Year</option>
                    </select>
                </div>
            </div>

            <div className={`p-0 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>

                {/* Hires */}
                <div className="border-b border-gray-100">
                    <div className="flex justify-between items-center px-4 pt-4 mb-2">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center">
                            HIRES <span className="ml-1 text-gray-300">℗</span>
                        </h4>
                        <button className="text-[11px] text-blue-600 font-medium">View more</button>
                    </div>
                    <div className="flex items-center justify-center py-4 text-xs text-gray-400">
                        {myStats.hires > 0 ? (
                            <div className="flex items-center justify-start px-4 w-full gap-4 overflow-x-auto">
                                <UserAvatar name="You" label="hires" count={myStats.hires} isMe={true} rank={3} />
                                {colleagues.map((c, i) => <UserAvatar key={i} name={c.name} label="hires" count={c.hires} rank={i + 1} />)}
                            </div>
                        ) : "No users with hires found."}
                    </div>
                </div>

                {/* Candidates */}
                <div className="border-b border-gray-100">
                    <div className="flex justify-between items-center px-4 pt-4 mb-2">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center">
                            CANDIDATES <span className="ml-1 text-gray-300">℗</span>
                        </h4>
                        <button className="text-[11px] text-blue-600 font-medium">View more</button>
                    </div>
                    <div className="flex items-center justify-start px-4 py-3 w-full gap-4 overflow-x-auto">
                        <UserAvatar name="You" label="candidates" count={myStats.candidates} isMe={true} />
                        {colleagues.map((c, i) => <UserAvatar key={i} name={c.name} label="candidates" count={c.candidates} rank={i + 1} />)}
                    </div>
                </div>

                {/* Jobs */}
                <div className="border-b border-gray-100">
                    <div className="flex justify-between items-center px-4 pt-4 mb-2">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center">
                            JOBS <span className="ml-1 text-gray-300">℗</span>
                        </h4>
                        <button className="text-[11px] text-blue-600 font-medium">View more</button>
                    </div>
                    <div className="flex items-center justify-center py-4 text-xs text-gray-400">
                        No users with jobs found.
                    </div>
                </div>

                {/* Actions Taken */}
                <div>
                    <div className="flex justify-between items-center px-4 pt-4 mb-2">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center">
                            ACTIONS TAKEN <span className="ml-1 text-gray-300">℗</span>
                        </h4>
                        <button className="text-[11px] text-blue-600 font-medium">View more</button>
                    </div>
                    <div className="flex items-center justify-start px-4 py-3 w-full gap-4 overflow-x-auto">
                        <UserAvatar name="You" label="Actions" count={myStats.actions} isMe={true} />
                        {colleagues.map((c, i) => <UserAvatar key={i} name={c.name} label="Actions" count={c.actions} rank={i + 1} />)}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TopPerformersWidget;
