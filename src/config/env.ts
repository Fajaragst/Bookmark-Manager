import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Load test environment variables if in test mode
if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' });
}

// Define a schema for environment variables validation
const envSchema = z.object({
  // Server configuration
  PORT: z.string().transform(val => parseInt(val, 10)).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database configuration
  DATABASE_URL: z.string().url(),
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(val => parseInt(val, 10)),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  // JWT configuration
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Domain
  DOMAIN: z.string().url(),
});

// Parse environment variables
const env = envSchema.parse(process.env);

export default env; 