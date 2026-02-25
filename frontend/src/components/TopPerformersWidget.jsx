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

    const MyRow = ({ label, count, rank }) => (
        <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow mb-2">
            <div className={`h-10 w-10 rounded-full bg-blue-100 overflow-hidden mr-3 flex items-center justify-center text-blue-600 font-bold`}>
                {user?.first_name?.[0] || 'U'}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-blue-600">You</span>
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{rank}</span>
                </div>
                <p className="text-xs text-gray-500">{count} {label}</p>
            </div>
        </div>
    );

    const ColleagueRow = ({ name, count, label, bg, text, rank }) => (
        <div className="flex items-center p-3 border border-gray-50 rounded-lg bg-gray-50 mb-2 opacity-75 hover:opacity-100 transition-opacity">
            <div className={`h-10 w-10 rounded-full ${bg} overflow-hidden mr-3 flex items-center justify-center ${text} font-bold`}>
                {name[0]}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-gray-700">{name}</span>
                    <span className="bg-gray-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{rank}</span>
                </div>
                <p className="text-xs text-gray-500">{count} {label}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">TOP PERFORMERS</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`text-xs border border-blue-600 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded bg-blue-50 focus:outline-none cursor-pointer"
                    >
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="this_year">This Year</option>
                    </select>
                </div>
            </div>

            <div className={`p-4 space-y-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>

                {/* Hires */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center">
                            HIRES <UserCheck size={12} className="ml-1" />
                        </h4>
                        <button
                            onClick={() => setExpandHires(!expandHires)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {expandHires ? 'Show Less' : 'View more'}
                        </button>
                    </div>
                    <div>
                        <MyRow label="Hires" count={myStats.hires} rank="3rd" />
                        {expandHires && colleagues.map((c, i) => (
                            <ColleagueRow key={i} name={c.name} count={c.hires} label="Hires" bg={c.bg} text={c.text} rank={`${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'}`} />
                        ))}
                    </div>
                </div>

                {/* Candidates */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center">
                            CANDIDATES <Users size={12} className="ml-1" />
                        </h4>
                        <button
                            onClick={() => setExpandCandidates(!expandCandidates)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {expandCandidates ? 'Show Less' : 'View more'}
                        </button>
                    </div>
                    <div>
                        <MyRow label="Candidates" count={myStats.candidates} rank="1st" />
                        {expandCandidates && colleagues.map((c, i) => (
                            <ColleagueRow key={i} name={c.name} count={c.candidates} label="Candidates" bg={c.bg} text={c.text} rank={`${i + 2}th`} />
                        ))}
                    </div>
                </div>

                {/* Actions Taken */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center">
                            ACTIONS TAKEN <Activity size={12} className="ml-1" />
                        </h4>
                        <button
                            onClick={() => setExpandActions(!expandActions)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {expandActions ? 'Show Less' : 'View more'}
                        </button>
                    </div>
                    <div>
                        <MyRow label="Actions" count={myStats.actions} rank="2nd" />
                        {expandActions && colleagues.map((c, i) => (
                            <ColleagueRow key={i} name={c.name} count={c.actions} label="Actions" bg={c.bg} text={c.text} rank={`${i === 1 ? 1 : i === 0 ? 3 : 4}th`} />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TopPerformersWidget;
