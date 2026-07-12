import axios from 'axios';
import { User } from '../types';

const API_BASE = 'http://localhost:5000/api';

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface CreateUserResponse {
  success: boolean;
  message?: string;
  user?: User;
  user_id?: number;
  error?: string;
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(`${API_BASE}/auth/login`, { email, password });
    return data;
  }

  async signup(firstName: string, lastName: string, email: string, password: string): Promise<CreateUserResponse> {
    const { data } = await axios.post<CreateUserResponse>(`${API_BASE}/users`, {
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: password,
    });
    return data;
  }
}

const authService = new AuthService();
export default authService;
