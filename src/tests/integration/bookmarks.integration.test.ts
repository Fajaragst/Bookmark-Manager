import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import app from '../../index';
import { setupTestEnvironment, teardownTestEnvironment, resetTestDatabase, createAuthHeader } from '../utils/test-helpers';
import { ErrorType } from '../../utils/error';
import { BookmarkListResponse, BookmarkDetailResponse } from '../types/bookmarks.responses';

describe('Bookmarks API Integration Tests', () => {
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

  describe('GET /api/bookmarks', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request('/api/bookmarks', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as BookmarkListResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return all bookmarks for authenticated user', async () => {
      const res = await testApp.request('/api/bookmarks', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as BookmarkListResponse;
      expect(Array.isArray(data.data?.items)).toBe(true);
      expect(data.data?.items?.length).toBeGreaterThan(0);
      expect(data.data?.pagination).toBeDefined();
      
      // Check if the test bookmark is in the response
      const testBookmark = data.data?.items?.find(bm => bm.id === testData.bookmark.id);
      expect(testBookmark).toBeDefined();
      expect(testBookmark?.title).toBe(testData.bookmark.title);
    });

    it('should filter bookmarks by category', async () => {
      const res = await testApp.request(`/api/bookmarks?categoryId=${testData.category.id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as BookmarkListResponse;
      expect(Array.isArray(data.data?.items)).toBe(true);
      
      // All returned bookmarks should have the specified category
      data.data?.items?.forEach(bookmark => {
        expect(bookmark.category?.id).toBe(testData.category.id);
      });
    });
  });

  describe('GET /api/bookmarks/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid bookmark ID', async () => {
      const res = await testApp.request('/api/bookmarks/invalid-id', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const res = await testApp.request('/api/bookmarks/999', {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should return bookmark by ID for authenticated user', async () => {
      const res = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.data).toBeDefined();
      expect(data.data?.id).toBe(testData.bookmark.id);
      expect(data.data?.title).toBe(testData.bookmark.title);
      expect(data.data?.url).toBe(testData.bookmark.url);
      expect(data.data?.userId).toBe(testData.user.id);
      
      // Check if category and tags are included
      expect(data.data?.category).toBeDefined();
      expect(data.data?.tags).toBeDefined();
      expect(Array.isArray(data.data?.tags)).toBe(true);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Test Bookmark',
          url: 'https://example.org',
          description: 'New Test Description',
          categoryId: testData.category.id,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid data', async () => {
      const res = await testApp.request('/api/bookmarks', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required title field
          url: 'https://example.org',
          description: 'Test Description',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.VALIDATION);
    });

    it('should create a new bookmark for authenticated user', async () => {
      const newBookmark = {
        title: 'New Test Bookmark',
        url: 'https://example.org',
        description: 'New Test Description',
        categoryId: testData.category.id,
        tags: ['test', 'new']
      };

      const res = await testApp.request('/api/bookmarks', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBookmark),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.data?.title).toBe(newBookmark.title);
      expect(data.data?.url).toBe(newBookmark.url);
      expect(data.data?.description).toBe(newBookmark.description);
      expect(data.data?.category?.id).toBe(newBookmark.categoryId);
      expect(data.data?.userId).toBe(testData.user.id);
      
      // Check if tags were associated
      expect(data.data?.tags).toBeDefined();
      expect(Array.isArray(data.data?.tags)).toBe(true);
    });
  });

  describe('PUT /api/bookmarks/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Bookmark',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid bookmark ID', async () => {
      const res = await testApp.request('/api/bookmarks/invalid-id', {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Bookmark',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const res = await testApp.request('/api/bookmarks/999', {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Bookmark',
          description: 'Updated Description',
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should update bookmark for authenticated user', async () => {
      const updatedBookmark = {
        title: 'Updated Bookmark',
        description: 'Updated Description',
        favorite: true,
        tags: ['test', 'updated']
      };

      const res = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBookmark),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.data).toBeDefined();
      expect(data.data?.id).toBe(testData.bookmark.id);
      expect(data.data?.title).toBe(updatedBookmark.title);
      expect(data.data?.description).toBe(updatedBookmark.description);
      expect(data.data?.favorite).toBe(updatedBookmark.favorite);
      expect(data.data?.userId).toBe(testData.user.id);
      
      // Check if tags were updated
      expect(data.data?.tags).toBeDefined();
      expect(Array.isArray(data.data?.tags)).toBe(true);
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should return 400 for invalid bookmark ID', async () => {
      const res = await testApp.request('/api/bookmarks/invalid-id', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(400);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.BAD_REQUEST);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const res = await testApp.request('/api/bookmarks/999', {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(404);
      const data = await res.json() as BookmarkDetailResponse;
      expect(data.error?.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should delete bookmark for authenticated user', async () => {
      const res = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      expect(res.status).toBe(200);
      const data = await res.json() as BookmarkDetailResponse;

      // Verify bookmark is deleted
      const getRes = await testApp.request(`/api/bookmarks/${testData.bookmark.id}`, {
        method: 'GET',
        headers: authHeaders,
      });

      expect(getRes.status).toBe(404);
    });
  });
}); 