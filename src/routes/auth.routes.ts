import { Hono } from 'hono';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = new Hono();

// Public routes
router.post('/register', ...authController.register);
router.post('/login', ...authController.login);
router.post('/refresh-token', ...authController.refreshToken);
router.post('/logout', ...authController.logout);

// Protected routes
router.get('/profile', authMiddleware, authController.getCurrentUser);

export default router; 