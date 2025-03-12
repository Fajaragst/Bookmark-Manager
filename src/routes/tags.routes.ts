import { Hono } from 'hono';
import * as tagController from '../controllers/tags.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = new Hono();

// All routes are protected
router.use('/*', authMiddleware);

// CRUD operations
router.get('/', tagController.getAllTags);
router.get('/:id', tagController.getTagById);
router.post('/', ...tagController.createTag);
router.put('/:id', ...tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

export default router; 