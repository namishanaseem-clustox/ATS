import client from './client';

export const getJobs = async (departmentId = null) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const { data } = await client.get('/jobs', { params });
    return data;
};

export const getJob = async (id) => {
    const { data } = await client.get(`/jobs/${id}`);
    return data;
};

export const createJob = async (jobData) => {
    const { data } = await client.post('/jobs', jobData);
    return data;
};

export const updateJob = async (id, jobData) => {
    const { data } = await client.put(`/jobs/${id}`, jobData);
    return data;
};

export const cloneJob = async (id) => {
    const { data } = await client.post(`/jobs/${id}/clone`);
    return data;
};

export const updatePipeline = async (id, config) => {
    const { data } = await client.put(`/jobs/${id}/pipeline`, config);
    return data;
};

export const deleteJob = async (id) => {
    const { data } = await client.delete(`/jobs/${id}`);
    return data;
};
