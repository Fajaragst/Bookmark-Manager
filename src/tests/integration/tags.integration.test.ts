import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import app from '../../index';
import { setupTestEnvironment, teardownTestEnvironment, resetTestDatabase, createAuthHeader } from '../utils/test-helpers';
import { ErrorType } from '../../utils/error';

// Define response types
interface TagResponse {
  success: boolean;
  data?: {
    tags?: any[];
    tag?: {
      id: number;
      name: string;
      description?: string;
      userId: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
  };
  error?: {
    type: ErrorType;
    message: string;
    details?: unknown;
  };
}

describe('Tags API Integration Tests', () => {
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

  describe('GET /api/tags', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request('/api/tags', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return all tags for authenticated user', async () => {
      const res = await testApp.request('/api/tags', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as TagResponse;
      expect(Array.isArray(data.data?.tags)).toBe(true);
      expect(data.data?.tags?.length).toBeGreaterThan(0);
      
      // Check if the test tags are in the response
      const testTag = data.data?.tags?.find(tag => tag.id === testData.tags[0].id);
      expect(testTag).toBeDefined();
      expect(testTag?.name).toBe(testData.tags[0].name);
    });
  });

  describe('GET /api/tags/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid tag ID', async () => {
      const res = await testApp.request('/api/tags/invalid-id', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent tag', async () => {
      const res = await testApp.request('/api/tags/999', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should return tag by ID for authenticated user', async () => {
      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as TagResponse;
      expect(data.data?.tag).toBeDefined();
      expect(data.data?.tag?.id).toBe(testData.tags[0].id);
      expect(data.data?.tag?.name).toBe(testData.tags[0].name);
      expect(data.data?.tag?.userId).toBe(testData.user.id);
    });
  });

  describe('POST /api/tags', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Test Tag',
          description: 'New Test Description',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid data', async () => {
      const res = await testApp.request('/api/tags', {
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
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should create a new tag for authenticated user', async () => {
      const newTag = {
        name: 'New Test Tag',
        description: 'New Test Description',
      };

      const res = await testApp.request('/api/tags', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTag),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as TagResponse;
      expect(data.data?.tag).toBeDefined();
      expect(data.data?.tag?.name).toBe(newTag.name);
      expect(data.data?.tag?.description).toBe(newTag.description);
      expect(data.data?.tag?.userId).toBe(testData.user.id);
    });

    it('should return 409 for duplicate tag name', async () => {
      const duplicateTag = {
        name: testData.tags[0].name, // Using existing tag name
        description: 'Duplicate Tag Description',
      };

      const res = await testApp.request('/api/tags', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateTag),
      });

      expect(res.status).toBe(409);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.CONFLICT);
    });
  });

  describe('PUT /api/tags/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Tag',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid tag ID', async () => {
      const res = await testApp.request('/api/tags/invalid-id', {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Tag',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent tag', async () => {
      const res = await testApp.request('/api/tags/999', {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Tag',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should update tag for authenticated user', async () => {
      const updatedTag = {
        name: 'Updated Tag',
        description: 'Updated Description',
      };

      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTag),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as TagResponse;
      expect(data.data?.tag).toBeDefined();
      expect(data.data?.tag?.id).toBe(testData.tags[0].id);
      expect(data.data?.tag?.name).toBe(updatedTag.name);
      expect(data.data?.tag?.description).toBe(updatedTag.description);
      expect(data.data?.tag?.userId).toBe(testData.user.id);
    });

    it('should return 409 for duplicate tag name', async () => {
      const duplicateTag = {
        name: testData.tags[1].name, // Using another existing tag name
        description: 'Duplicate Tag Description',
      };

      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateTag),
      });

      expect(res.status).toBe(409);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.CONFLICT);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid tag ID', async () => {
      const res = await testApp.request('/api/tags/invalid-id', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent tag', async () => {
      const res = await testApp.request('/api/tags/999', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
      const data = await res.json() as TagResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should delete tag for authenticated user', async () => {
      const res = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as TagResponse;

      // Verify tag is deleted
      const getRes = await testApp.request(`/api/tags/${testData.tags[0].id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(getRes.status).toBe(404);
    });
  });
}); 