import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const registerUser = async (payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'donor' | 'patient' | 'hospital' | 'bloodBank';
}) => {
  const response = await api.post('/api/auth/register', payload);
  return response.data;
};

export const loginUser = async (payload: { email: string; password: string }) => {
  const response = await api.post('/api/auth/login', payload);
  return response.data;
};

export const getCurrentUser = async (token: string) => {
  const response = await api.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const logoutUser = async (token: string) => {
  const response = await api.post(
    '/api/auth/logout',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
