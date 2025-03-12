import { Context, Next, MiddlewareHandler } from 'hono';
import { getUserById } from '../models/users.model';
import { verifyAccessToken } from '../utils/auth';
import logger from '../utils/logger';
import { sendInternalError, sendUnauthorized } from '../utils/error';

declare module 'hono' {
  interface ContextVariableMap {
    userId: number;
    username: string;
  }
}

// Middleware to verify JWT token and extract user information
export const authMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    // Check if Authorization header exists and has the correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(c, 'No token provided');
    }
    
    // Extract token
    const token = authHeader.substring(7);
    
    // Verify token
    const payload = await verifyAccessToken(token);
    
    if (!payload) {
      return sendUnauthorized(c, 'Invalid token');
    }
    
    // Get user from database
    const userId = parseInt(payload.sub, 10);
    const user = await getUserById(userId);
    
    if (!user) {
      return sendUnauthorized(c, 'User not found');
    }
    
    // Add user details to context for route handlers
    c.set('userId', userId);
    c.set('username', user.username);
    
    await next();
  } catch (error) {
    logger.error({ error }, 'Error in auth middleware');
    return sendInternalError(c, 'Internal server error');
  }
};

// Optional auth middleware - doesn't require authentication but sets user context if token is valid
export const optionalAuthMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyAccessToken(token);
      
      if (payload) {
        const userId = parseInt(payload.sub, 10);
        const user = await getUserById(userId);
        
        if (user) {
          c.set('userId', userId);
          c.set('username', user.username);
        }
      }
    }
    
    await next();
  } catch (error) {
    logger.error({ error }, 'Error in optional auth middleware');
    await next();
  }
}; 