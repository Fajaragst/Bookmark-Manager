import { describe, it, expect, beforeAll, mock } from 'bun:test';
import { Hono } from 'hono';
import app from '../index';
import * as tagModel from '../models/tags.model';
import { ErrorType } from '../utils/error';
import { TagListResponse, TagDetailResponse } from './types/tag.responses';

describe('Tags API', () => {
  const testUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'test_password_hash',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testTag = {
    id: 1,
    userId: testUser.id,
    name: 'Test Tag',
    description: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(() => {
    // Mock auth utils
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

    // Mock tag model functions
    mock.module('../models/tags.model', () => ({
      createTag: () => Promise.resolve(testTag),
      getTagById: (id: number) => {
        if (id === 999) return Promise.resolve(null);
        return Promise.resolve(testTag);
      },
      getTagsByUserId: () => Promise.resolve([testTag]),
      updateTag: () => Promise.resolve(testTag),
      deleteTag: () => Promise.resolve(true),
    }));
  });

  // Test getting all tags
  it('should get all tags', async () => {
    const res = await app.request('/api/tags', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as TagListResponse;
    expect(body.message).toBe('Resources retrieved successfully');
    expect(body.data?.items).toBeDefined();
    expect(body.data?.items?.length).toBe(1);
    expect(body.data?.items?.[0].name).toBe(testTag.name);
    expect(body.data?.pagination).toBeDefined();
    expect(body.data?.pagination?.total).toBe(1);
  });

  // Test getting a single tag
  it('should get a tag by ID', async () => {
    const res = await app.request('/api/tags/1', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as TagDetailResponse;
    expect(body.message).toBe('Resource retrieved successfully');
    expect(body.data?.name).toBe(testTag.name);
  });

  // Test creating a tag
  it('should create a new tag', async () => {
    const res = await app.request('/api/tags', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer dummy-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'New Tag',
        description: 'New Description'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json() as TagDetailResponse;
    expect(body.message).toContain('created successfully');
    expect(body.data?.name).toBe(testTag.name);
  });

  // Test updating a tag
  it('should update a tag', async () => {
    const res = await app.request('/api/tags/1', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer dummy-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Updated Tag'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as TagDetailResponse;
    expect(body.message).toContain('updated successfully');
    expect(body.data?.name).toBe(testTag.name);
  });

  // Test deleting a tag
  it('should delete a tag', async () => {
    const res = await app.request('/api/tags/1', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as TagDetailResponse;
    expect(body.message).toContain('deleted successfully');
  });

  // Test error handling for invalid tag ID
  it('should return 400 for invalid tag ID', async () => {
    const res = await app.request('/api/tags/invalid', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    });

    expect(res.status).toBe(400);
    const body = await res.json() as TagDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.BAD_REQUEST);
    expect(body.error?.message).toContain('Invalid tag ID');
  });

  // Test error handling for non-existent tag
  it('should return 404 for non-existent tag', async () => {
    const res = await app.request('/api/tags/999', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    });

    expect(res.status).toBe(404);
    const body = await res.json() as TagDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.NOT_FOUND);
    expect(body.error?.message).toContain('Tag not found');
  });

  // Test validation error handling
  it('should return 400 for invalid tag data', async () => {
    const res = await app.request('/api/tags', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer dummy-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Missing required name field
        description: 'Invalid Tag'
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json() as TagDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.VALIDATION);
    expect(body.error?.details).toBeDefined();
  });
}); 