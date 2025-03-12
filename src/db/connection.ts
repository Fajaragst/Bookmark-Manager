import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import env from '../config/env';
import logger from '../utils/logger';
import * as schema from './schema';

// Create a postgres connection
const client = postgres(env.DATABASE_URL);

// Create a drizzle instance
const db = drizzle(client, { schema });

// Test the connection
async function testConnection() {
  try {
    // A simple query to test the connection
    await client`SELECT 1`;
    logger.info('Successfully connected to PostgreSQL database');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to PostgreSQL database');
  }
}

// Run the test connection
testConnection();

export default db;
export { client }; 