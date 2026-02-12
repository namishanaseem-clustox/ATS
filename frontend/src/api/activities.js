import client from './client';

export const getJobActivities = async (jobId) => {
    const { data } = await client.get(`/activities/job/${jobId}`);
    return data;
};

export const getCandidateActivities = async (candidateId) => {
    const { data } = await client.get(`/activities/candidate/${candidateId}`);
    return data;
};

export const getActivity = async (id) => {
    const { data } = await client.get(`/activities/${id}`);
    return data;
};

export const createActivity = async (activityData) => {
    const { data } = await client.post('/activities', activityData);
    return data;
};

export const updateActivity = async (id, activityData) => {
    const { data } = await client.put(`/activities/${id}`, activityData);
    return data;
};

export const deleteActivity = async (id) => {
    const { data } = await client.delete(`/activities/${id}`);
    return data;
};
