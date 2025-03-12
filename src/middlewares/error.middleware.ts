import { Context, Next, MiddlewareHandler, NotFoundHandler } from 'hono';
import { sendInternalError, ErrorType } from '../utils/error';
import logger from '../utils/logger';

// Error handling middleware
export const errorMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    logger.error({ error }, 'Error caught in error middleware');
    return sendInternalError(c, 'Internal server error', error);
  }
};

// Not found middleware
export const notFoundMiddleware: NotFoundHandler = (c) => {
  return c.json({
    error: {
      type: ErrorType.NOT_FOUND,
      message: 'Resource not found'
    }
  }, 404);
}; 