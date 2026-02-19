import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getJobs } from '../api/jobs';

const MyJobsWidget = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const data = await getJobs();
                // Filter for Published jobs and take top 5
                const active = data.filter(j => j.status === 'Published')
                    .slice(0, 5);
                setJobs(active);
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    if (loading) return <div className="animate-pulse h-48 bg-gray-100 rounded-lg"></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center">
                    <Briefcase className="mr-2 h-5 w-5 text-orange-600" />
                    Active Jobs
                </h3>
                <button
                    onClick={() => navigate('/jobs')}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                    View All
                </button>
            </div>

            {jobs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-6">
                    <Briefcase size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">No active jobs</p>
                </div>
            ) : (
                <div className="flex-1 space-y-3">
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="group flex items-start p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                        >
                            <div className="mt-1">
                                <span className={`block w-2 h-2 rounded-full ${job.status === 'Published' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-orange-700 transition-colors">
                                    {job.title}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <MapPin size={12} className="mr-1" />
                                    {job.location || 'Remote'}
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyJobsWidget;
