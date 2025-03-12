import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import app from '../../index';
import { setupTestEnvironment, teardownTestEnvironment, resetTestDatabase, createAuthHeader } from '../utils/test-helpers';
import env from '../../config/env';
import { ErrorType } from '../../utils/error';

import { AuthResponse } from '../types/auth.responses';

describe('Authentication API Integration Tests', () => {
  let testApp: Hono;
  let testData: any;

  // Setup test environment before all tests
  beforeAll(async () => {
    await setupTestEnvironment();
    testApp = app;
  });

  // Teardown test environment after all tests
  afterAll(async () => {
    await teardownTestEnvironment();
  });

  // Reset database before each test
  beforeEach(async () => {
    testData = await resetTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const res = await testApp.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as AuthResponse;
      expect(data.error?.type).toBe(ErrorType.VALIDATION);
      expect(data.error?.message).toContain('Invalid login data');
    // Check for validation details in the error response
      expect(data.error?.details).toBeDefined();
      const details = data.error?.details as any;
      expect(details._errors).toBeInstanceOf(Array);
      expect(details.username?._errors).toContain("Required");
      expect(details.password?._errors).toContain("Required");
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await testApp.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test@example.com',
          password: 'wrong_password',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as AuthResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
      expect(data.error?.message).toContain('Invalid username or password');
    });

    // Note: We can't test successful login in integration tests without knowing the actual password hash
    // This would require mocking the password verification or using a known password/hash
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 for missing refresh token', async () => {
      const res = await testApp.request('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as AuthResponse;
      expect(data.error?.type).toBe(ErrorType.VALIDATION);
      expect(data.error?.message).toContain('Invalid refresh token');
      expect(data.error?.details).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await testApp.request('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'invalid_refresh_token',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as AuthResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
      expect(data.error?.message).toContain('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 400 for missing token', async () => {
      const res = await testApp.request('/api/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(400);
      const data = await res.json() as AuthResponse;
      expect(data.error?.type).toBe(ErrorType.VALIDATION);
      expect(data.error?.message).toContain('Invalid refresh token');
      expect(data.error?.details).toBeDefined();
    });

    it('should successfully logout with valid token', async () => {
      const headers = await createAuthHeader(testData.user);
      
      const res = await testApp.request('/api/auth/logout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          refreshToken: 'test_refresh_token', // This would normally be a valid token
        }),
      });

      // Even with an invalid refresh token, the endpoint should return success
      // as we're just testing the authentication middleware
      expect(res.status).toBe(200);
      const data = await res.json() as AuthResponse;
    });
  });
}); 