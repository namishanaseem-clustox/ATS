import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm';
import { createJob } from '../api/jobs';
import { getDepartments } from '../api/departments';

const JobWizard = () => {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const data = await getDepartments();
                setDepartments(data);
            } catch (error) {
                console.error("Failed to fetch departments", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDepartments();
    }, []);

    const handleSubmit = async (jobData) => {
        try {
            await createJob(jobData);
            navigate('/jobs'); // Redirect to Job Board
        } catch (error) {
            console.error("Failed to create job", error);
            alert("Failed to create job. Check console.");
        }
    };

    const handleCancel = () => {
        navigate('/jobs');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading wizard...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <JobForm
                departments={departments}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default JobWizard;
