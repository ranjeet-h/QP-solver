import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api'; // Import the centralized base URL

// Define base API configuration - Using imported base URL now
const API_CONFIG = {
  // BASE_URL: 'https://your-api-base-url.com', // Removed hardcoded URL
  TIMEOUT: 30000, // 30 seconds
};

// Define response types
// Export the interface so it can be imported elsewhere
export interface ApiResponse<T = any> {
  history: T;
  status: number;
  message?: string;
}

// Create API client instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL, // Use the base URL directly (it now includes /api/v1)
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Platform': Platform.OS,
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // You might want to redirect to login or refresh token
      await AsyncStorage.removeItem('userToken');
      // You can add navigation logic here
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  get: async <T>(url: string, params?: object): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
      throw error;
    }
  },

  post: async <T>(url: string, data?: object): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
      throw error;
    }
  },

  put: async <T>(url: string, data?: object): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
      throw error;
    }
  },

  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url);
      return response.data;
    } catch (error) {
      handleApiError(error as AxiosError);
      throw error;
    }
  },
};

// Error handler
const handleApiError = (error: AxiosError) => {
  if (error.response) {
    // Server responded with error status
    console.log('API Error:', error.response.data);
    console.log('Status:', error.response.status);
  } else if (error.request) {
    // Request made but no response
    console.log('Network Error:', error.request);
  } else {
    // Error in request setup
    console.log('Error:', error.message);
  }
};

export default api; 