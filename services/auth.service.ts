import api from '../utils/api';
import { UserCreate, UserResponse, UserLogin, Token } from '../types/user';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface LoginRequest {
  email?: string | null;
  phone_number?: string | null;
  password: string;
}

export const authService = {
  login: (credentials: UserLogin) => {
    return api.post<Token>('/auth/login', credentials);
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

  register: (userData: UserCreate) => {
    return api.post<UserResponse>('/auth/register', userData);
  },
}; 