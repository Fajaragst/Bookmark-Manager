import { Hono } from 'hono';
import * as bookmarkController from '../controllers/bookmarks.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = new Hono();

// All routes are protected
router.use('/*', authMiddleware);

// CRUD operations
router.get('/', ...bookmarkController.getBookmarks);
router.get('/:id', bookmarkController.getBookmarkById);
router.post('/', ...bookmarkController.createBookmark);
router.put('/:id', ...bookmarkController.updateBookmark);
router.delete('/:id', bookmarkController.deleteBookmark);

export default router; 