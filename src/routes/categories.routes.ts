import { Hono } from 'hono';
import * as categoryController from '../controllers/categories.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = new Hono();

// All routes are protected
router.use('/*', authMiddleware);

// CRUD operations
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', ...categoryController.createCategory);
router.put('/:id', ...categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router; 