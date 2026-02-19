import React, { useState, useEffect } from 'react';
import { User, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCandidates } from '../api/candidates';
import { getJobs } from '../api/jobs';

const RecentActionsWidget = () => {
    const [items, setItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [candidatesData, jobsData] = await Promise.all([getCandidates(), getJobs()]);

                const formattedCandidates = candidatesData.slice(0, 4).map(c => ({
                    id: c.id,
                    type: 'candidate',
                    title: `${c.first_name} ${c.last_name}`,
                    subtitle: c.current_position || 'Candidate',
                    icon: User,
                    color: 'text-blue-600',
                    bg: 'bg-blue-100',
                    link: `/candidates/${c.id}`
                }));

                const formattedJobs = jobsData.slice(0, 4).map(j => ({
                    id: j.id,
                    type: 'job',
                    title: j.title,
                    subtitle: j.department?.name || 'Job',
                    icon: Briefcase,
                    color: 'text-purple-600',
                    bg: 'bg-purple-100',
                    link: `/jobs/${j.id}`
                }));

                setItems([...formattedCandidates, ...formattedJobs]);
            } catch (error) {
                console.error("Error fetching actions", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 mt-6">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-lg">RECENT ACTIONS</h3>
            </div>

            <div className="p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                    CANDIDATES <span className="ml-2 text-gray-400">ℹ️</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {items.filter(i => i.type === 'candidate').map(item => (
                        <div
                            key={item.id}
                            onClick={() => navigate(item.link)}
                            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow text-center flex flex-col items-center"
                        >
                            <div className={`h-12 w-12 rounded-full ${item.bg} ${item.color} flex items-center justify-center mb-3`}>
                                <item.icon size={20} />
                            </div>
                            <h5 className="font-bold text-blue-600 text-sm truncate w-full">{item.title}</h5>
                            <p className="text-xs text-gray-500 truncate w-full">{item.subtitle}</p>
                        </div>
                    ))}
                </div>

                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                    JOBS <span className="ml-2 text-gray-400">ℹ️</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.filter(i => i.type === 'job').map(item => (
                        <div
                            key={item.id}
                            onClick={() => navigate(item.link)}
                            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow text-center flex flex-col items-center"
                        >
                            <div className={`h-12 w-12 rounded-full ${item.bg} ${item.color} flex items-center justify-center mb-3`}>
                                <item.icon size={20} />
                            </div>
                            <h5 className="font-bold text-purple-600 text-sm truncate w-full">{item.title}</h5>
                            <p className="text-xs text-gray-500 truncate w-full">{item.subtitle}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RecentActionsWidget;
