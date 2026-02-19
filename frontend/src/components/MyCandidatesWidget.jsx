import React, { useState, useEffect } from 'react';
import { User, MapPin, ChevronRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCandidates } from '../api/candidates';

const MyCandidatesWidget = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                // Determine user role (this logic might need refinement if getCandidates doesn't auto-filter by "My Candidates" for all roles)
                // Assuming getCandidates already returns context-relevant candidates based on backend logic we implemented
                const data = await getCandidates();
                // Take top 5 most recent
                const recent = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5);
                setCandidates(recent);
            } catch (error) {
                console.error("Failed to fetch candidates", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCandidates();
    }, []);

    if (loading) return <div className="animate-pulse h-48 bg-gray-100 rounded-lg"></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center">
                    <User className="mr-2 h-5 w-5 text-blue-600" />
                    New Candidates
                </h3>
                <button
                    onClick={() => navigate('/candidates')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                    View All
                </button>
            </div>

            {candidates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-6">
                    <User size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">No recent candidates</p>
                </div>
            ) : (
                <div className="flex-1 space-y-3">
                    {candidates.map(candidate => (
                        <div
                            key={candidate.id}
                            onClick={() => navigate(`/candidates/${candidate.id}`)}
                            className="group flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                        >
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                                {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                    {candidate.first_name} {candidate.last_name}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <Briefcase size={12} className="mr-1" />
                                    <span className="truncate">{candidate.current_position || 'No Title'}</span>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyCandidatesWidget;
