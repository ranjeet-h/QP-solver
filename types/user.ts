// Based on backend schemas (e.g., schemas/user.py)

export interface UserCreate {
  email: string;
  password: string;
  first_name: string;
  last_name?: string | null;
  phone_number?: string | null; // Optional, allow null if backend sends it
}

export interface UserResponse {
  id: string; // Assuming ID is a string (like UUID)
  email: string;
  phone_number?: string | null;
  full_name?: string | null;
  is_active: boolean;
  created_at: string; // Typically ISO date string
  // Add other fields returned by the backend as needed
}

export interface Token {
  access_token: string;
  token_type: string;
}

// You might add other user-related types here, e.g., UserLogin
export interface UserLogin {
  email?: string | null;
  phone_number?: string | null;
  password: string;
} 