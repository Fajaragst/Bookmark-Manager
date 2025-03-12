import { z } from 'zod';
import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import db from '../db/connection';
import { users } from '../db/schema';
import logger from '../utils/logger';

// User schemas
export const userSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(3).max(50),
  email: z.string().email().max(100),
  password: z.string().min(8).max(100),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const userLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const userResponseSchema = userSchema.omit({ password: true });

// Types
export type User = z.infer<typeof userSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

// Simple password hashing for development
// In production, use a proper library like bcrypt
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// User model functions
export async function createUser(user: User): Promise<UserResponse> {
  try {
    const { username, email, password } = user;
    const passwordHash = hashPassword(password);
    
    const [insertedUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
    
    return {
      id: insertedUser.id,
      username: insertedUser.username,
      email: insertedUser.email,
      created_at: insertedUser.createdAt || new Date(),
      updated_at: insertedUser.updatedAt || new Date(),
    };
  } catch (error) {
    logger.error({ error }, 'Error creating user');
    throw error;
  }
}

export async function getUserById(id: number): Promise<UserResponse | null> {
  try {
    const result = await db.select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.isActive, true)
      ));
    
    if (result.length === 0) {
      return null;
    }
    
    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.createdAt || undefined,
      updated_at: user.updatedAt || undefined
    };
  } catch (error) {
    logger.error({ error }, 'Error getting user by ID');
    throw error;
  }
}

export async function getUserByUsername(username: string): Promise<(UserResponse & { password_hash: string }) | null> {
  try {
    const result = await db.select()
      .from(users)
      .where(and(
        eq(users.username, username),
        eq(users.isActive, true)
      ));
    
    if (result.length === 0) {
      return null;
    }
    
    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.passwordHash,
      created_at: user.createdAt || undefined,
      updated_at: user.updatedAt || undefined
    };
  } catch (error) {
    logger.error({ error }, 'Error getting user by username');
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<UserResponse | null> {
  try {
    const result = await db.select()
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.isActive, true)
      ));
    
    if (result.length === 0) {
      return null;
    }
    
    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.createdAt || undefined,
      updated_at: user.updatedAt || undefined
    };
  } catch (error) {
    logger.error({ error }, 'Error getting user by email');
    throw error;
  }
}

export async function updateUser(id: number, userData: Partial<User>): Promise<UserResponse | null> {
  try {
    const updateData: Record<string, any> = {};
    
    // Only include allowed fields
    if (userData.username !== undefined) updateData.username = userData.username;
    if (userData.email !== undefined) updateData.email = userData.email;
    
    if (Object.keys(updateData).length === 0) {
      return await getUserById(id);
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    
    if (!updatedUser) {
      return null;
    }
    
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      created_at: updatedUser.createdAt || new Date(),
      updated_at: updatedUser.updatedAt || new Date(),
    };
  } catch (error) {
    logger.error({ error }, 'Error updating user');
    throw error;
  }
}

export async function updatePassword(id: number, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = hashPassword(newPassword);
    
    const result = await db.update(users)
      .set({ 
        passwordHash, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
    
    return true;
  } catch (error) {
    logger.error({ error }, 'Error updating password');
    throw error;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    const result = await db.update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(users.id, id),
        eq(users.isActive, true)
      ));
    
    return result.count > 0;
  } catch (error) {
    logger.error({ error }, 'Error deleting user');
    throw error;
  }
} 