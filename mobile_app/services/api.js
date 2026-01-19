import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getExpenses = async () => {
  const response = await api.get('/expenses');
  return response.data;
};

export const getExpensesByDateRange = async (startDate, endDate) => {
  const response = await api.get('/expenses/filter', {
    params: { startDate, endDate }
  });
  return response.data;
};

export const getCategoryBreakdown = async (startDate, endDate) => {
  const response = await api.get('/expenses/category-breakdown', {
    params: { startDate, endDate }
  });
  return response.data;
};

export const getInsights = async () => {
  const response = await api.get('/expenses/insights');
  return response.data;
};

export const addExpense = async (expense) => {
  const response = await api.post('/expenses', expense);
  return response.data;
};

export const bulkAddExpenses = async (expenses) => {
  const response = await api.post('/expenses/bulk', { expenses });
  return response.data;
};

export const updateExpense = async (id, expense) => {
  const response = await api.put(`/expenses/${id}`, expense);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};


