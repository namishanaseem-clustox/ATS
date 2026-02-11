import React, { useState, useEffect } from 'react';
import { getJobs } from '../api/jobs';

const JobSelector = ({ selectedJobId, onSelect, label = "Assign to Job (Optional)" }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const data = await getJobs();
                // Filter for published jobs only? Or all? Let's show all for now, or maybe non-closed.
                setJobs(data);
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const selectedJob = jobs.find(j => j.id === selectedJobId);

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <select
                    value={selectedJobId || ""}
                    onChange={(e) => onSelect(e.target.value === "" ? null : e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#00C853] focus:border-[#00C853] sm:text-sm rounded-md shadow-sm border"
                >
                    <option value="">None (Add to Talent Pool)</option>
                    {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                            {job.title}
                        </option>
                    ))}
                </select>
            </div>
            {selectedJob && (
                <p className="mt-1 text-xs text-gray-500">
                    Candidate will be added to the <strong>New</strong> stage of this job's pipeline.
                </p>
            )}
        </div>
    );
};

export default JobSelector;
