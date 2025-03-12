import { describe, it, expect } from 'bun:test';
import { Context } from 'hono';
import { createSuccessResponse, sendSuccess, sendCreated, sendUpdated, sendDeleted, sendRetrieved, sendList } from '../../utils/response';

interface ListResponse {
  message: string;
  data: {
    items: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

describe('Response Utilities', () => {
  // Mock Context
  const mockContext = {
    json: (data: any, status?: number) => ({
      json: () => Promise.resolve(data),
      status: status || 200,
    }),
  } as unknown as Context;

  describe('createSuccessResponse', () => {
    it('should create a success response with message only', () => {
      const response = createSuccessResponse('Test message');
      expect(response).toEqual({
        message: 'Test message'
      });
    });

    it('should create a success response with message and data', () => {
      const data = { id: 1, name: 'test' };
      const response = createSuccessResponse('Test message', data);
      expect(response).toEqual({
        message: 'Test message',
        data: { id: 1, name: 'test' }
      });
    });
  });

  describe('sendSuccess', () => {
    it('should send a success response with default status 200', async () => {
      const response = sendSuccess(mockContext, 'Success message');
      expect(await response.json()).toEqual({
        message: 'Success message'
      });
      expect(response.status).toBe(200);
    });

    it('should send a success response with custom status', async () => {
      const response = sendSuccess(mockContext, 'Success message', { id: 1 }, 201);
      expect(await response.json()).toEqual({
        message: 'Success message',
        data: { id: 1 }
      });
      expect(response.status).toBe(201);
    });
  });

  describe('sendCreated', () => {
    it('should send a created response with status 201', async () => {
      const response = sendCreated(mockContext, 'Resource created', { id: 1 });
      expect(await response.json()).toEqual({
        message: 'Resource created',
        data: { id: 1 }
      });
      expect(response.status).toBe(201);
    });
  });

  describe('sendUpdated', () => {
    it('should send an updated response with status 200', async () => {
      const response = sendUpdated(mockContext, 'Resource updated', { id: 1 });
      expect(await response.json()).toEqual({
        message: 'Resource updated',
        data: { id: 1 }
      });
      expect(response.status).toBe(200);
    });
  });

  describe('sendDeleted', () => {
    it('should send a deleted response with default message', async () => {
      const response = sendDeleted(mockContext);
      expect(await response.json()).toEqual({
        message: 'Resource deleted successfully'
      });
      expect(response.status).toBe(200);
    });

    it('should send a deleted response with custom message', async () => {
      const response = sendDeleted(mockContext, 'Custom delete message');
      expect(await response.json()).toEqual({
        message: 'Custom delete message'
      });
      expect(response.status).toBe(200);
    });
  });

  describe('sendRetrieved', () => {
    it('should send a retrieved response with data', async () => {
      const data = { id: 1, name: 'test' };
      const response = sendRetrieved(mockContext, data);
      expect(await response.json()).toEqual({
        message: 'Resource retrieved successfully',
        data: { id: 1, name: 'test' }
      });
      expect(response.status).toBe(200);
    });
  });

  describe('sendList', () => {
    it('should send a list response with pagination', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = sendList(mockContext, items, 10, 1, 5);
      const jsonResponse = await response.json() as ListResponse;
      expect(jsonResponse).toEqual({
        message: 'Resources retrieved successfully',
        data: {
          items: [{ id: 1 }, { id: 2 }],
          pagination: {
            total: 10,
            page: 1,
            limit: 5,
            pages: 2
          }
        }
      });
      expect(response.status).toBe(200);
    });

    it('should calculate pages correctly', async () => {
      const items = [{ id: 1 }];
      const response = sendList(mockContext, items, 11, 1, 3);
      const jsonResponse = await response.json() as ListResponse;
      expect(jsonResponse.data.pagination.pages).toBe(4);
    });
  });
}); 