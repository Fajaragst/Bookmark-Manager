import { describe, it, expect, beforeAll, mock } from 'bun:test';
import { Hono } from 'hono';
import app from '../index';
import * as userModel from '../models/users.model';
import * as auth from '../utils/auth';
import { ErrorType } from '../utils/error';
import { AuthResponse, LogoutResponse, UserData } from './types/auth.responses';

describe('Authentication API', () => {
  const testUser: UserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com'
  };

  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';

  beforeAll(() => {
    // Mock auth middleware
    mock.module('../middlewares/auth.middleware', () => ({
      authMiddleware: async (c: any, next: any) => {
        c.set('userId', testUser.id);
        c.set('username', testUser.username);
        await next();
      }
    }));

    // Mock user model functions
    mock.module('../models/users.model', () => ({
      createUser: () => Promise.resolve({ ...testUser, password: 'Password123!' }),
      getUserByUsername: () => Promise.resolve({
        ...testUser,
        password_hash: userModel.hashPassword('Password123!'),
      }),
      getUserById: () => Promise.resolve(testUser),
      hashPassword: (password: string) => password,
    }));

    // Mock auth functions
    mock.module('../utils/auth', () => ({
      generateAccessToken: () => Promise.resolve(mockAccessToken),
      generateRefreshToken: () => Promise.resolve(mockRefreshToken),
      verifyAccessToken: () => Promise.resolve({
        sub: testUser.id.toString(),
        username: testUser.username,
        email: testUser.email,
        type: 'access',
      }),
      verifyRefreshToken: () => Promise.resolve({ userId: testUser.id }),
      removeRefreshToken: () => Promise.resolve(true),
    }));
  });

  // Test registration
  it('should register a new user', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUser.username,
        email: testUser.email,
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(201);
    const response = await res.json() as AuthResponse;
    expect(response.message).toContain('registered successfully');
    expect(response.data?.user).toBeDefined();
    expect(response.data?.accessToken).toBeDefined();
    expect(response.data?.refreshToken).toBeDefined();
  });

  // Test login
  it('should login a user with valid credentials', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUser.username,
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(200);
    const response = await res.json() as AuthResponse;
    expect(response.message).toContain('Login successful');
    expect(response.data?.user).toBeDefined();
    expect(response.data?.accessToken).toBeDefined();
    expect(response.data?.refreshToken).toBeDefined();
  });

  // Test refresh token
  it('should refresh access token with valid refresh token', async () => {
    const res = await app.request('/api/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockAccessToken}`,
      },
      body: JSON.stringify({
        refreshToken: mockRefreshToken,
      }),
    });

    expect(res.status).toBe(200);
    const response = await res.json() as AuthResponse;
    expect(response.data?.accessToken).toBeDefined();
  });

  // Test logout
  it('should logout a user', async () => {
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockAccessToken}`,
      },
      body: JSON.stringify({
        refreshToken: mockRefreshToken,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as AuthResponse;
    expect(data.message).toContain('Logout successful');
  });

  // Test invalid login
  it('should reject invalid credentials', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUser.username,
        password: 'wrongpassword',
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json() as AuthResponse;
    expect(data.error).toBeDefined();
    expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    expect(data.error?.message).toContain('Invalid username or password');
  });
}); 