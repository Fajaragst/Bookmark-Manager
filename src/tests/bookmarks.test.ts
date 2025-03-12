import { describe, it, expect, beforeAll, mock } from 'bun:test';
import { Hono } from 'hono';
import app from '../index';
import * as bookmarkModel from '../models/bookmarks.model';
import * as auth from '../utils/auth';
import { ErrorType } from '../utils/error';
import { 
  BookmarkData,
  BookmarkListResponse,
  BookmarkDetailResponse
} from './types/bookmarks.responses';
import { UserData } from './types/auth.responses';

describe('Bookmarks API', () => {
  const testUser: UserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com'
  };

  const mockAccessToken = 'mock-access-token';

  const testBookmark: BookmarkData = {
    id: 1,
    title: 'Test Bookmark',
    url: 'https://example.com',
    description: 'Test description',
    favorite: false,
    categoryId: 1,
    userId: testUser.id
  };

  beforeAll(() => {
    // Mock auth middleware
    mock.module('../utils/auth', () => ({
      verifyAccessToken: () => Promise.resolve({
        sub: testUser.id.toString(),
        username: testUser.username,
        email: testUser.email,
        type: 'access',
      }),
    }));

    // Mock user model
    mock.module('../models/users.model', () => ({
      getUserById: () => Promise.resolve(testUser),
    }));

    // Mock bookmark model functions
    mock.module('../models/bookmarks.model', () => ({
      createBookmark: () => Promise.resolve(testBookmark),
      getBookmarkById: (id: number) => {
        if (id === 999) return Promise.resolve(null);
        return Promise.resolve(testBookmark);
      },
      getBookmarksByUserId: () => Promise.resolve({
        bookmarks: [testBookmark],
        total: 1
      }),
      updateBookmark: () => Promise.resolve(testBookmark),
      deleteBookmark: () => Promise.resolve(true),
    }));
  });

  // Test getting all bookmarks
  it('should get all bookmarks', async () => {
    const res = await app.request('/api/bookmarks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const response = await res.json() as BookmarkListResponse;
    expect(response.data?.items).toBeDefined();
    expect(Array.isArray(response.data?.items)).toBe(true);
  });

  // Test getting a single bookmark
  it('should get a bookmark by ID', async () => {
    const res = await app.request(`/api/bookmarks/${testBookmark.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const response = await res.json() as BookmarkDetailResponse;
    expect(response.data).toBeDefined();
    expect(response.data?.id).toBe(testBookmark.id);
  });

  // Test creating a bookmark
  it('should create a new bookmark', async () => {
    const res = await app.request('/api/bookmarks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'New Bookmark',
        url: 'https://example.com/new',
        description: 'New Description',
        category_id: 1,
        tags: ['test', 'example']
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json() as BookmarkDetailResponse;
    expect(body.message).toContain('created successfully');
    expect(body.data).toBeDefined();
  });

  // Test updating a bookmark
  it('should update a bookmark', async () => {
    const res = await app.request('/api/bookmarks/1', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Updated Bookmark',
        favorite: true
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as BookmarkDetailResponse;
    expect(body.message).toContain('updated successfully');
    expect(body.data).toBeDefined();
  });

  // Test deleting a bookmark
  it('should delete a bookmark', async () => {
    const res = await app.request('/api/bookmarks/1', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as BookmarkDetailResponse;
    expect(body.message).toContain('deleted successfully');
  });

  // Test filtering bookmarks
  it('should filter bookmarks by category', async () => {
    const res = await app.request('/api/bookmarks?category_id=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as BookmarkListResponse;
    expect(body.data?.items).toBeDefined();
    expect(body.data?.pagination).toBeDefined();
  });

  // Test favorite bookmarks
  it('should get favorite bookmarks', async () => {
    const res = await app.request('/api/bookmarks?favorite=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as BookmarkListResponse;
    expect(body.data?.items).toBeDefined();
    expect(body.data?.pagination).toBeDefined();
  });

  // Test error handling for invalid bookmark ID
  it('should return 400 for invalid bookmark ID', async () => {
    const res = await app.request('/api/bookmarks/invalid', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(400);
    const body = await res.json() as BookmarkDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.BAD_REQUEST);
    expect(body.error?.message).toContain('Invalid bookmark ID');
  });

  // Test error handling for non-existent bookmark
  it('should return 404 for non-existent bookmark', async () => {
    const res = await app.request('/api/bookmarks/999', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(404);
    const body = await res.json() as BookmarkDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.NOT_FOUND);
    expect(body.error?.message).toContain('Bookmark not found');
  });

  // Test validation error handling
  it('should return 400 for invalid bookmark data', async () => {
    const res = await app.request('/api/bookmarks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Missing required title and url
        description: 'Invalid Bookmark'
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json() as BookmarkDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.VALIDATION);
    expect(body.error?.details).toBeDefined();
  });
}); 