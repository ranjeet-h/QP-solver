import api from '../utils/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

export const authService = {
  login: (credentials: LoginRequest) => {
    return api.post<LoginResponse>('/auth/login', credentials);
  },

  logout: () => {
    return api.post('/auth/logout');
  },

  getCurrentUser: () => {
    return api.get<LoginResponse>('/auth/me');
  },
  forgotPassword: (email: string) => {
    return api.post('/auth/forgot-password', { email });
  },
  resetPassword: (token: string, newPassword: string) => {
    return api.post('/auth/reset-password', { token, newPassword });
  },
  
}; 