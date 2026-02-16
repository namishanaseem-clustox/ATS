import React, { useState, useEffect } from 'react';
import { getJobs } from '../api/jobs';
import CustomSelect from './CustomSelect';

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
            <CustomSelect
                label={label}
                value={selectedJobId}
                onChange={(e) => onSelect(e.target.value === "" ? null : e.target.value)}
                options={[
                    { value: "", label: "None (Add to Talent Pool)" },
                    ...jobs.map(job => ({ value: job.id, label: job.title }))
                ]}
                className="mb-0"
            />
            {selectedJob && (
                <p className="mt-1 text-xs text-gray-500">
                    Candidate will be added to the <strong>New</strong> stage of this job's pipeline.
                </p>
            )}
        </div>
    );
};

export default JobSelector;
