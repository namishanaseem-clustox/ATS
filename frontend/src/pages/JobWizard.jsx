import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import JobForm from '../components/JobForm';
import { createJob, getJob, updateJob } from '../api/jobs';
import { getDepartments } from '../api/departments';

const JobWizard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { id } = useParams(); // Get ID if editing
    const initialDepartmentId = searchParams.get('dept');
    const [departments, setDepartments] = useState([]);
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const depts = await getDepartments();
                setDepartments(depts);

                if (id) {
                    const job = await getJob(id);
                    // Transform job data if needed to match form structure
                    setJobData({
                        ...job,
                        department_id: job.department_id, // Ensure ID is used
                        hiring_manager_id: job.hiring_manager_id,
                        recruiter_id: job.recruiter_id
                    });
                } else if (initialDepartmentId) {
                    setJobData({ department_id: initialDepartmentId });
                }
            } catch (error) {
                console.error("Failed to initialize wizard", error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id, initialDepartmentId]);

    const handleSubmit = async (formData) => {
        try {
            if (id) {
                await updateJob(id, formData);
                navigate(`/jobs/${id}`);
            } else {
                await createJob(formData);
                navigate('/jobs');
            }
        } catch (error) {
            console.error("Failed to save job", error);
            alert("Failed to save job. Check console.");
        }
    };

    const handleCancel = () => {
        if (id) {
            navigate(`/jobs/${id}`);
        } else {
            navigate('/jobs');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <JobForm
                initialData={jobData}
                departments={departments}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                disableDepartmentSelect={!!initialDepartmentId && !id} // Only disable if creating new from department context
            />
        </div>
    );
};

export default JobWizard;
