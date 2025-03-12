import { Hono } from 'hono'
import { logger as loggerMiddleware } from 'hono/logger'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import env from './config/env'
import logger from './utils/logger'
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware'
import { cleanupExpiredTokens } from './utils/auth'

// Import routes
import authRoutes from './routes/auth.routes'
import categoryRoutes from './routes/categories.routes'
import bookmarkRoutes from './routes/bookmarks.routes'
import tagRoutes from './routes/tags.routes'

// Create Hono app
const app = new Hono()

// Apply global middlewares
app.use('*', loggerMiddleware())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: env.NODE_ENV === 'development' ? '*' : env.DOMAIN,
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}))

// Error middleware
app.use('*', errorMiddleware)

// Setup routes
app.route('/api/auth', authRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/bookmarks', bookmarkRoutes)
app.route('/api/tags', tagRoutes)

// API base route
app.get('/api', (c) => {
  return c.json({
    message: 'Welcome to the Bookmark Management API',
    version: '1.0.0',
  })
})

// Root route for health check
app.get('/', (c) => {
  return c.json({
    status: 'OK',
    message: 'Bookmark Management API is running',
    environment: env.NODE_ENV,
  })
})

// Handle not found routes
app.notFound(notFoundMiddleware)

// Start server
const port = env.PORT
const host = env.HOST

// Periodically clean up expired tokens (every hour)
setInterval(async () => {
  try {
    const deletedCount = await cleanupExpiredTokens()
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired refresh tokens`)
    }
  } catch (error) {
    logger.error({ error }, 'Error cleaning up expired tokens')
  }
}, 60 * 60 * 1000)

export default app
