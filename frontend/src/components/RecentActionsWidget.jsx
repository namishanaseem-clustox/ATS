import React, { useState, useEffect } from 'react';
import { User, Briefcase, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCandidates } from '../api/candidates';
import { getJobs } from '../api/jobs';

const RecentActionsWidget = () => {
    const [candidates, setCandItems] = useState([]);
    const [jobs, setJobItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [candidatesData, jobsData] = await Promise.all([getCandidates(), getJobs()]);

                const formattedCandidates = candidatesData
                    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
                    .slice(0, 4)
                    .map(c => ({
                        id: c.id,
                        first_name: c.first_name,
                        last_name: c.last_name,
                        initials: `${c.first_name[0]}${c.last_name[0]}`.toUpperCase(),
                        subtitle: c.applications?.[0]?.job?.title || 'General Application',
                        colorClass: 'bg-[#FF5252] text-white', // Redish avatar
                        link: `/candidates/${c.id}`
                    }));

                const formattedJobs = jobsData
                    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
                    .slice(0, 4)
                    .map(j => ({
                        id: j.id,
                        title: j.title,
                        initials: j.title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
                        subtitle: j.department?.name || 'Department',
                        colorClass: 'bg-[#512DA8] text-white', // Purple avatar
                        link: `/jobs/${j.id}`
                    }));

                setCandItems(formattedCandidates);
                setJobItems(formattedJobs);
            } catch (error) {
                console.error("Error fetching actions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-sm"></div>;

    return (
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden w-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-[15px] uppercase tracking-wide">RECENT ACTIONS</h3>
            </div>

            <div className="p-5 space-y-6">

                {/* Candidates Section */}
                <div>
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center mb-3">
                        CANDIDATES <span className="ml-1 text-gray-300">℗</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {candidates.map(item => (
                            <div
                                key={`cand-${item.id}`}
                                onClick={() => navigate(item.link)}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 hover:shadow-md cursor-pointer transition-all bg-white"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3 ${item.colorClass}`}>
                                    {item.initials}
                                </div>
                                <h5 className="font-medium text-blue-600 text-[13px] truncate w-full text-center">{item.first_name} {item.last_name}</h5>
                                <p className="text-[11px] text-gray-500 truncate w-full text-center mt-0.5">{item.subtitle}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Jobs Section */}
                <div>
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase flex items-center mb-3">
                        JOBS <span className="ml-1 text-gray-300">℗</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {jobs.map(item => (
                            <div
                                key={`job-${item.id}`}
                                onClick={() => navigate(item.link)}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 hover:shadow-md cursor-pointer transition-all bg-white"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-inner ${item.colorClass}`}>
                                    {item.initials}
                                </div>
                                <h5 className="font-medium text-blue-600 text-[13px] truncate w-full text-center">{item.title}</h5>
                                <p className="text-[11px] text-gray-500 truncate w-full text-center mt-0.5">{item.subtitle}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RecentActionsWidget;
