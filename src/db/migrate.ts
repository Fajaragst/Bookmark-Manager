import { migrate } from 'drizzle-orm/postgres-js/migrator';
import db, { client } from './connection';
import logger from '../utils/logger';

// Migrate function
async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    console.log(error);
    logger.error({ error }, 'Error during database migration');
    throw error;
  } finally {
    // Close the connection
    await client.end();
  }
}

// Run migration
runMigrations()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error({ error }, 'Migration script failed');
    process.exit(1);
  }); 