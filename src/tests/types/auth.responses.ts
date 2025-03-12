import { ErrorResponse } from './common.responses';

export interface UserData {
  id: number;
  username: string;
  email: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  message?: string;
  data?: {
    user?: UserData;
    accessToken?: string;
    refreshToken?: string;
  };
  error?: ErrorResponse;
}

export interface LogoutResponse {
  message?: string;
  error?: ErrorResponse;
} 