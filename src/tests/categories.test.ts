import { describe, it, expect, beforeAll, mock } from 'bun:test';
import { Hono } from 'hono';
import app from '../index';
import * as categoryModel from '../models/categories.model';
import * as auth from '../utils/auth';
import { ErrorType } from '../utils/error';
import {
  CategoryData,
  CategoryListResponse,
  CategoryDetailResponse
} from './types/categories.responses';
import { UserData } from './types/auth.responses';

describe('Categories API', () => {
  const testUser: UserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com'
  };

  const mockAccessToken = 'mock-access-token';

  const testCategory: CategoryData = {
    id: 1,
    name: 'Test Category',
    description: 'Test Description',
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
    // Mock category model functions
    mock.module('../models/categories.model', () => ({
      createCategory: () => Promise.resolve(testCategory),
      getCategoryById: () => Promise.resolve(testCategory),
      getCategoriesByUserId: () => Promise.resolve([testCategory]),
      updateCategory: () => Promise.resolve(testCategory),
      deleteCategory: () => Promise.resolve(true),
    }));
  });

  // Test getting all categories
  it('should get all categories', async () => {
    const res = await app.request('/api/categories', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as CategoryListResponse;
    expect(body.data?.items).toBeDefined();
    expect(body.data?.items?.length).toBe(1);
    expect(body.data?.items?.[0].name).toBe(testCategory.name);
  });

  // Test getting a single category
  it('should get a category by ID', async () => {
    const res = await app.request('/api/categories/1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as CategoryDetailResponse;
    expect(body.data).toBeDefined();
    expect(body.data?.name).toBe(testCategory.name);
  });

  // Test creating a category
  it('should create a new category', async () => {
    const res = await app.request('/api/categories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'New Category',
        description: 'New Description'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json() as CategoryDetailResponse;
    expect(body.message).toContain('created successfully');
    expect(body.data).toBeDefined();
  });

  // Test updating a category
  it('should update a category', async () => {
    const res = await app.request('/api/categories/1', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Updated Category'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as CategoryDetailResponse;
    expect(body.message).toContain('updated successfully');
    expect(body.data).toBeDefined();
  });

  // Test deleting a category
  it('should delete a category', async () => {
    const res = await app.request('/api/categories/1', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as CategoryDetailResponse;
    expect(body.message).toContain('deleted successfully');
  });

  // Test error handling for invalid category ID
  it('should return 400 for invalid category ID', async () => {
    const res = await app.request('/api/categories/invalid', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockAccessToken}`
      }
    });

    expect(res.status).toBe(400);
    const body = await res.json() as CategoryDetailResponse;
    expect(body.error).toBeDefined();
    expect(body.error?.type).toBe(ErrorType.BAD_REQUEST);
    expect(body.error?.message).toContain('Invalid category ID');
  });
}); 