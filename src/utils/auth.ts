import * as jose from 'jose';
import * as crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import env from '../config/env';
import logger from '../utils/logger';
import db from '../db/connection';
import { refreshTokens } from '../db/schema';
import { UserResponse } from '../models/users.model';

// Secret key for JWT signing
const secretKey = new TextEncoder().encode(env.JWT_SECRET);

// Token types
export type JwtPayload = {
  sub: string;
  username: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
};

// Generate access token
export async function generateAccessToken(user: UserResponse): Promise<string> {
  try {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id!.toString(),
      username: user.username,
      email: user.email,
      type: 'access',
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_ACCESS_EXPIRATION)
      .sign(secretKey);

    return token;
  } catch (error) {
    logger.error({ error }, 'Error generating access token');
    throw error;
  }
}

// Generate refresh token
export async function generateRefreshToken(user: UserResponse): Promise<string> {
  try {
    // Generate a random token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Calculate expiration date
    const expiresAt = new Date();
    // Parse expiration string (e.g., "7d" to 7 days)
    const expirationStr = env.JWT_REFRESH_EXPIRATION;
    const days = parseInt(expirationStr.replace(/\D/g, ''), 10);
    expiresAt.setDate(expiresAt.getDate() + days);
    
    // Store refresh token in database
    await db.insert(refreshTokens).values({
      userId: user.id!,
      token: refreshToken,
      expiresAt,
    }).onConflictDoNothing();
    
    return refreshToken;
  } catch (error) {
    logger.error({ error }, 'Error generating refresh token');
    throw error;
  }
}

// Verify access token
export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    
    // Make sure it's an access token
    if (payload.type !== 'access') {
      return null;
    }
    
    return payload as unknown as JwtPayload;
  } catch (error) {
    logger.error({ error }, 'Error verifying access token');
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<{ userId: number } | null> {
  try {
    const results = await db.select({
      userId: refreshTokens.userId
    }).from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          sql`${refreshTokens.expiresAt} > CURRENT_TIMESTAMP`
        )
      )
      .limit(1);
    
    if (results.length === 0) {
      return null;
    }
    
    return { userId: results[0].userId };
  } catch (error) {
    logger.error({ error }, 'Error verifying refresh token');
    return null;
  }
}

// Remove refresh token (logout)
export async function removeRefreshToken(token: string): Promise<boolean> {
  try {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    return true;
  } catch (error) {
    logger.error({ error }, 'Error removing refresh token');
    return false;
  }
}

// Clean up expired tokens
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await db.delete(refreshTokens)
      .where(sql`${refreshTokens.expiresAt} < CURRENT_TIMESTAMP`)
      .returning();
    
    return result.length;
  } catch (error) {
    logger.error({ error }, 'Error cleaning up expired tokens');
    return 0;
  }
} 