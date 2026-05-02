import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/api/auth/login', data);
export const register = (data) => API.post('/api/auth/register', data);
export const getMe = () => API.get('/api/auth/me');

// Events
export const getEvents = (params) => API.get('/api/events', { params });
export const createEvent = (data) => API.post('/api/events', data);
export const getEvent = (id) => API.get(`/api/events/${id}`);
export const deleteEvent = (id) => API.delete(`/api/events/${id}`);
export const sendEvent = (id) => API.post(`/api/events/${id}/send`);

// Admin
export const getUsers = (params) => API.get('/api/auth/users', { params });
export const getStats = () => API.get('/api/auth/stats');
export const toggleUser = (id) => API.patch(`/api/auth/users/${id}/toggle`);

// Notifications
export const getNotifications = () => API.get('/api/notifications');
export const markRead = (id) => API.patch(`/api/notifications/${id}/read`);

export default API;
