import axios from 'axios';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';

const API_BASE_URL = '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request Interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('taxi_simulator_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log the request
    useDeveloperLogsStore.getState().addApiLog({
      method: config.method?.toUpperCase() || 'GET',
      url: `${config.baseURL || ''}${config.url || ''}`,
      requestData: config.data,
      status: 0, // Pending
    });
    return config;
  },
  (error) => {
    useDeveloperLogsStore.getState().addApiLog({
      method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      url: error.config?.url || 'UNKNOWN',
      requestData: error.config?.data,
      status: 500,
      error: error.message,
    });
    return Promise.reject(error);
  }
);

// Response Interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    // Update the pending request log with the actual status and data
    const url = `${response.config.baseURL || ''}${response.config.url || ''}`;
    const method = response.config.method?.toUpperCase() || 'GET';
    
    useDeveloperLogsStore.getState().addApiLog({
      method,
      url,
      requestData: response.config.data ? JSON.parse(response.config.data) : undefined,
      responseData: response.data,
      status: response.status,
    });
    
    return response;
  },
  (error) => {
    const response = error.response;
    const config = error.config || {};
    const url = `${config.baseURL || ''}${config.url || ''}`;
    const method = config.method?.toUpperCase() || 'UNKNOWN';

    useDeveloperLogsStore.getState().addApiLog({
      method,
      url,
      requestData: config.data ? JSON.parse(config.data) : undefined,
      responseData: response?.data,
      status: response?.status || 500,
      error: error.message,
    });

    return Promise.reject(error);
  }
);
