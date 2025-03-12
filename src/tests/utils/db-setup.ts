import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import db, { client } from '../../db/connection';
import logger from '../../utils/logger';
import * as schema from '../../db/schema';

/**
 * Setup the test database by running migrations and seeding test data
 */
export async function setupTestDatabase() {
  try {
    logger.info('Setting up test database...');
    
    // Run migrations
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    
    // Clear all data from tables
    await clearAllTables();
    
    // Seed test data
    await seedTestData();
    
    logger.info('Test database setup completed');
  } catch (error) {
    logger.error({ error }, 'Error setting up test database');
    throw error;
  }
}

/**
 * Clear all data from tables
 */
export async function clearAllTables() {
  try {
    logger.info('Clearing all tables...');
    
    // Disable foreign key checks temporarily
    await db.execute(sql`SET session_replication_role = 'replica'`);
    
    // Clear all tables
    await db.delete(schema.bookmarkTags);
    await db.delete(schema.bookmarks);
    await db.delete(schema.tags);
    await db.delete(schema.categories);
    await db.delete(schema.refreshTokens);
    await db.delete(schema.users);
    
    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin'`);
    
    logger.info('All tables cleared');
  } catch (error) {
    logger.error({ error }, 'Error clearing tables');
    throw error;
  }
}

/**
 * Seed test data
 */
export async function seedTestData() {
  try {
    logger.info('Seeding test data...');
    
    // Generate a unique timestamp suffix for test data
    const timestamp = Date.now();
    
    // Insert test user
    const [testUser] = await db.insert(schema.users).values({
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      passwordHash: 'password_hash_for_testing',
      isActive: true,
    }).returning();
    
    // Insert test categories
    const [testCategory] = await db.insert(schema.categories).values({
      userId: testUser.id,
      name: `Test Category ${timestamp}`,
      description: 'Test Description',
      isActive: true,
    }).returning();
    
    // Insert test tags
    const [testTag1] = await db.insert(schema.tags).values({
      userId: testUser.id,
      name: `test_${timestamp}`,
      description: 'Test Tag',
      isActive: true,
    }).returning();
    
    const [testTag2] = await db.insert(schema.tags).values({
      userId: testUser.id,
      name: `example_${timestamp}`,
      description: 'Example Tag',
      isActive: true,
    }).returning();
    
    // Insert test bookmark
    const [testBookmark] = await db.insert(schema.bookmarks).values({
      userId: testUser.id,
      categoryId: testCategory.id,
      title: `Test Bookmark ${timestamp}`,
      url: 'https://example.com',
      description: 'Test Description',
      favorite: false,
      isActive: true,
    }).returning();
    
    // Associate tags with bookmark
    await db.insert(schema.bookmarkTags).values({
      bookmarkId: testBookmark.id,
      tagId: testTag1.id,
    });
    
    await db.insert(schema.bookmarkTags).values({
      bookmarkId: testBookmark.id,
      tagId: testTag2.id,
    });
    
    logger.info('Test data seeded successfully');
    
    return {
      user: testUser,
      category: testCategory,
      tags: [testTag1, testTag2],
      bookmark: testBookmark,
    };
  } catch (error) {
    logger.error({ error }, 'Error seeding test data');
    throw error;
  }
}

/**
 * Tear down the test database
 */
export async function teardownTestDatabase() {
  try {
    logger.info('Tearing down test database...');
    
    // Clear all data
    await clearAllTables();
    
    // Don't close the database connection here
    // We'll keep it open for subsequent tests
    
    logger.info('Test database teardown completed');
  } catch (error) {
    logger.error({ error }, 'Error tearing down test database');
    throw error;
  }
}

/**
 * Close database connection - call this after all tests are complete
 */
export async function closeTestDatabaseConnection() {
  try {
    logger.info('Closing test database connection...');
    await client.end();
    logger.info('Test database connection closed');
  } catch (error) {
    logger.error({ error }, 'Error closing test database connection');
  }
} 