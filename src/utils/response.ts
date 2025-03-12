import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// Success response interface
export interface SuccessResponse<T> {
  data?: T;
  message: string;
}

// Create success response
export function createSuccessResponse<T>(
  message: string,
  data?: T
): SuccessResponse<T> {
  return {
    message,
    ...(data && { data })
  };
}

// Send success response
export function sendSuccess<T>(
  c: Context,
  message: string,
  data?: T,
  status: ContentfulStatusCode = 200
): Response {
  return c.json(createSuccessResponse(message, data), status);
}

// Common success responses
export function sendCreated<T>(
  c: Context,
  message: string,
  data?: T
): Response {
  return sendSuccess(c, message, data, 201);
}

export function sendUpdated<T>(
  c: Context,
  message: string,
  data?: T
): Response {
  return sendSuccess(c, message, data);
}

export function sendDeleted(
  c: Context,
  message: string = 'Resource deleted successfully'
): Response {
  return sendSuccess(c, message);
}

export function sendRetrieved<T>(
  c: Context,
  data: T
): Response {
  return sendSuccess(c, 'Resource retrieved successfully', data);
}

// List response with pagination
export function sendList<T>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  limit: number
): Response {
  return sendSuccess(c, 'Resources retrieved successfully', {
    items: data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
} 