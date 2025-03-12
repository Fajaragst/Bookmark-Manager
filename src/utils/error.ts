import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import env from '../config/env';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS'
}

// Error response interface
export interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    details?: unknown;
  };
  status: number;
}

// Specialized error response senders
export function sendBadRequest(c: Context, message: string, details?: unknown): Response {
  const errorBody = {
    type: ErrorType.BAD_REQUEST,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 400 as ContentfulStatusCode);
}

export function sendUnauthorized(c: Context, message: string = 'Unauthorized', details?: unknown): Response {
  const errorBody = {
    type: ErrorType.AUTHENTICATION,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 401 as ContentfulStatusCode);
}

export function sendForbidden(c: Context, message: string = 'Forbidden', details?: unknown): Response {
  const errorBody = {
    type: ErrorType.AUTHORIZATION,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 403 as ContentfulStatusCode);
}

export function sendNotFound(c: Context, message: string = 'Resource not found', details?: unknown): Response {
  const errorBody = {
    type: ErrorType.NOT_FOUND,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 404 as ContentfulStatusCode);
}

export function sendConflict(c: Context, message: string, details?: unknown): Response {
  const errorBody = {
    type: ErrorType.CONFLICT,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 409 as ContentfulStatusCode);
}

export function sendValidationError(c: Context, message: string = 'Validation error', details?: unknown): Response {
  const errorBody = {
    type: ErrorType.VALIDATION,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 400 as ContentfulStatusCode);
}

export function sendTooManyRequests(c: Context, message: string = 'Too many requests', details?: unknown): Response {
  const errorBody = {
    type: ErrorType.TOO_MANY_REQUESTS,
    message
  };
  
  if (details !== undefined) {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 429 as ContentfulStatusCode);
}

export function sendInternalError(c: Context, message: string = 'Internal server error', details?: unknown): Response {
  const errorBody = {
    type: ErrorType.INTERNAL,
    message
  };
  
  if (details !== undefined && env.NODE_ENV === 'development') {
    (errorBody as any).details = details;
  }
  
  return c.json({ error: errorBody }, 500 as ContentfulStatusCode);
} 