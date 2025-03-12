import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import app from '../../index';
import { setupTestEnvironment, teardownTestEnvironment, resetTestDatabase, createAuthHeader } from '../utils/test-helpers';
import { ErrorType } from '../../utils/error';
import { CategoryListResponse, CategoryDetailResponse } from '../types/categories.responses';


describe('Categories API Integration Tests', () => {
  let testApp: Hono;
  let testData: any;
  let authHeaders: Record<string, string>;

  // Setup test environment before all tests
  beforeAll(async () => {
    await setupTestEnvironment();
    testApp = app;
  });

  // Teardown test environment after all tests
  afterAll(async () => {
    await teardownTestEnvironment();
  });

  // Reset database and create auth headers before each test
  beforeEach(async () => {
    testData = await resetTestDatabase();
    authHeaders = await createAuthHeader(testData.user);
  });

  describe('GET /api/categories', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request('/api/categories', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return all categories for authenticated user', async () => {
      const res = await testApp.request('/api/categories', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as CategoryListResponse;
      expect(Array.isArray(data.data?.items)).toBe(true);
      expect(data.data?.items?.length).toBeGreaterThan(0);
      
      // Check if the test category is in the response
      const testCategory = data.data?.items?.find(cat => cat.id === testData.category.id);
      expect(testCategory).toBeDefined();
      expect(testCategory?.name).toBe(testData.category.name);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid category ID', async () => {
      const res = await testApp.request('/api/categories/invalid-id', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent category', async () => {
      const res = await testApp.request('/api/categories/999', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should return category by ID for authenticated user', async () => {
      const res = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.data?.id).toBe(testData.category.id);
      expect(data.data?.name).toBe(testData.category.name);
      expect(data.data?.userId).toBe(testData.user.id);
    });
  });

  describe('POST /api/categories', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Test Category',
          description: 'New Test Description',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid data', async () => {
      const res = await testApp.request('/api/categories', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required name field
          description: 'Test Description',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.VALIDATION);
    });

    it('should create a new category for authenticated user', async () => {
      const newCategory = {
        name: 'New Test Category',
        description: 'New Test Description',
      };

      const res = await testApp.request('/api/categories', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.data?.id).toBeDefined();
      expect(data.data?.name).toBe(newCategory.name);
      expect(data.data?.description).toBe(newCategory.description);
      expect(data.data?.userId).toBe(testData.user.id);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Category',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid category ID', async () => {
      const res = await testApp.request('/api/categories/invalid-id', {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Category',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent category', async () => {
      const res = await testApp.request('/api/categories/999', {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Category',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should update category for authenticated user', async () => {
      const updatedCategory = {
        name: 'Updated Category',
        description: 'Updated Description',
      };

      const res = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCategory),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.data?.id).toBeDefined();
      expect(data.data?.name).toBe(updatedCategory.name);
      expect(data.data?.description).toBe(updatedCategory.description);
      expect(data.data?.userId).toBe(testData.user.id);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid category ID', async () => {
      const res = await testApp.request('/api/categories/invalid-id', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent category', async () => {
      const res = await testApp.request('/api/categories/999', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
      const data = await res.json() as CategoryDetailResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should delete category for authenticated user', async () => {
      const res = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as CategoryDetailResponse;

      // Verify category is deleted
      const getRes = await testApp.request(`/api/categories/${testData.category.id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(getRes.status).toBe(404);
    });
  });
}); 