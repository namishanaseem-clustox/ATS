import client from './client';

export const getCandidates = async (params = {}) => {
    const { data } = await client.get('/candidates/', { params });
    return data;
};

export const getCandidate = async (id) => {
    const { data } = await client.get(`/candidates/${id}`);
    return data;
};

export const createCandidate = async (candidateData) => {
    const { data } = await client.post('/candidates/', candidateData);
    return data;
};

export const updateCandidate = async (id, candidateData) => {
    const { data } = await client.put(`/candidates/${id}`, candidateData);
    return data;
};

export const deleteCandidate = async (id) => {
    const { data } = await client.delete(`/candidates/${id}`);
    return data;
};

export const uploadResume = async (formData) => {
    const { data } = await client.post('/candidates/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

export const getJobCandidates = async (jobId) => {
    const { data } = await client.get(`/jobs/${jobId}/candidates`);
    return data;
};
