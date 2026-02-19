import client from './client';

export const getScorecardTemplates = async () => {
    const { data } = await client.get('/scorecards/');
    return data;
};

export const getScorecardTemplate = async (id) => {
    const { data } = await client.get(`/scorecards/${id}`);
    return data;
};

export const createScorecardTemplate = async (templateData) => {
    const { data } = await client.post('/scorecards/', templateData);
    return data;
};

export const updateScorecardTemplate = async (id, templateData) => {
    const { data } = await client.put(`/scorecards/${id}`, templateData);
    return data;
};

export const deleteScorecardTemplate = async (id) => {
    const { data } = await client.delete(`/scorecards/${id}`);
    return data;
};
