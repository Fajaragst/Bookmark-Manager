import { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as userModel from '../models/users.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, removeRefreshToken } from '../utils/auth';
import logger from '../utils/logger';
import { 
  sendUnauthorized, 
  sendValidationError, 
  sendInternalError, 
  sendNotFound 
} from '../utils/error';
import { sendCreated, sendSuccess, sendRetrieved } from '../utils/response';

// Schema for user registration
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(100),
  password: z.string().min(8).max(100),
});

// Schema for user login
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Schema for token refresh
const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Register a new user
export const register = [
  zValidator('json', registerSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid registration data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userData = await c.req.json();
      
      // Create the user
      const user = await userModel.createUser(userData);
      
      // Generate tokens
      const accessToken = await generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user);
      
      return sendCreated(c, 'User registered successfully', {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      logger.error({ error }, 'Error registering user');
      return sendInternalError(c, 'Failed to register user');
    }
  }
];

// Login user
export const login = [
  zValidator('json', loginSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid login data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const { username, password } = await c.req.json();
      
      // Check if user exists
      const user = await userModel.getUserByUsername(username);
      
      if (!user) {
        return sendUnauthorized(c, 'Invalid username or password');
      }
      
      // Verify password
      const passwordHash = userModel.hashPassword(password);
      if (passwordHash !== user.password_hash) {
        return sendUnauthorized(c, 'Invalid username or password');
      }
      
      // Generate tokens
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
      
      const accessToken = await generateAccessToken(userResponse);
      const refreshToken = await generateRefreshToken(userResponse);
      
      return sendSuccess(c, 'Login successful', {
        user: userResponse,
        accessToken,
        refreshToken
      });
    } catch (error) {
      logger.error({ error }, 'Error logging in user');
      return sendInternalError(c, 'Failed to log in');
    }
  }
];

// Refresh access token
export const refreshToken = [
  zValidator('json', refreshTokenSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid refresh token data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const { refreshToken } = await c.req.json();
      
      // Verify refresh token
      const tokenData = await verifyRefreshToken(refreshToken);
      
      if (!tokenData) {
        return sendUnauthorized(c, 'Invalid refresh token');
      }
      
      // Get user data
      const user = await userModel.getUserById(tokenData.userId);
      
      if (!user) {
        return sendNotFound(c, 'User not found');
      }
      
      // Generate new access token
      const accessToken = await generateAccessToken(user);
      
      return sendSuccess(c, 'Token refreshed successfully', {
        accessToken
      });
    } catch (error) {
      logger.error({ error }, 'Error refreshing token');
      return sendInternalError(c, 'Failed to refresh token');
    }
  }
];

// Logout user
export const logout = [
  zValidator('json', refreshTokenSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid refresh token data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const { refreshToken } = await c.req.json();
      
      // Remove refresh token
      await removeRefreshToken(refreshToken);
      
      return sendSuccess(c, 'Logout successful');
    } catch (error) {
      logger.error({ error }, 'Error logging out user');
      return sendInternalError(c, 'Failed to log out');
    }
  }
];

// Get current user profile
export const getCurrentUser = async (c: Context) => {
  try {
    const userId = c.get('userId');
    
    // Get user data
    const user = await userModel.getUserById(userId);
    
    if (!user) {
      return sendNotFound(c, 'User not found');
    }
    
    return sendRetrieved(c, { user });
  } catch (error) {
    logger.error({ error }, 'Error getting current user');
    return sendInternalError(c, 'Failed to retrieve user profile');
  }
}; 