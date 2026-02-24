import client from './client';

export const getDashboardOverview = async () => {
  const { data } = await client.get('/dashboard/overview');
  return data;
};

export const getRecentActivities = async () => {
  const { data } = await client.get('/dashboard/recent-activities');
  return data;
};

export const getTopPerformers = async () => {
  const { data } = await client.get('/dashboard/top-performers');
  return data;
};

export const getActionsTaken = async () => {
  const { data } = await client.get('/dashboard/actions-taken');
  return data;
};

export const getMyPerformance = async () => {
  const { data } = await client.get('/dashboard/my-performance');
  return data;
};

export const dismissActivity = async (notificationKey) => {
  const { data } = await client.post(`/dashboard/recent-activities/${notificationKey}/dismiss`);
  return data;
};
