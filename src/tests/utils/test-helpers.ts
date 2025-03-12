import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import env from '../../config/env';
import { setupTestDatabase, teardownTestDatabase, seedTestData, closeTestDatabaseConnection as closeDbConnection } from './db-setup';
import { users } from '../../db/schema';
import { generateAccessToken } from '../../utils/auth';

// Define User type based on the users table schema
type User = typeof users.$inferSelect;

/**
 * Create a test app instance
 */
export function createTestApp() {
  const app = new Hono();
  return app;
}

/**
 * Generate a valid JWT token for testing
 */
export async function generateTestToken(user: User) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
  };

  return await generateAccessToken(payload);
}

/**
 * Setup function to run before all tests
 */
export async function setupTestEnvironment() {
  // Set NODE_ENV to test if not already set
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
  }
  
  // Setup test database
  await setupTestDatabase();
}

/**
 * Teardown function to run after all tests
 */
export async function teardownTestEnvironment() {
  await teardownTestDatabase();
}

/**
 * Close database connection after all tests are complete
 */
export async function closeTestDatabaseConnection() {
  await closeDbConnection();
}

/**
 * Reset database between tests
 */
export async function resetTestDatabase() {
  return await seedTestData();
}

/**
 * Create authorization header with JWT token
 */
export async function createAuthHeader(user: User) {
  const token = await generateTestToken(user);
  return {
    Authorization: `Bearer ${token}`,
  };
} 