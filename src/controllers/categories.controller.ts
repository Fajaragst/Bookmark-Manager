import { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as categoryModel from '../models/categories.model';
import logger from '../utils/logger';
import { 
  sendBadRequest, 
  sendNotFound, 
  sendInternalError, 
  sendValidationError 
} from '../utils/error';
import { sendCreated, sendUpdated, sendDeleted, sendRetrieved, sendList } from '../utils/response';

// Schema for category creation
const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

// Schema for category update
const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Get all categories for the current user
export const getAllCategories = async (c: Context) => {
  try {
    const userId = c.get('userId');
    
    const categories = await categoryModel.getCategoriesByUserId(userId);
    
    return sendList(c, categories, categories.length, 1, categories.length);
  } catch (error) {
    logger.error({ error }, 'Error getting all categories');
    return sendInternalError(c, 'Failed to retrieve categories');
  }
};

// Get a single category by ID
export const getCategoryById = async (c: Context) => {
  try {
    const userId = c.get('userId');
    const categoryId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(categoryId)) {
      return sendBadRequest(c, 'Invalid category ID');
    }
    
    const category = await categoryModel.getCategoryById(categoryId, userId);
    
    if (!category) {
      return sendNotFound(c, 'Category not found');
    }
    
    return sendRetrieved(c, category );
  } catch (error) {
    logger.error({ error }, 'Error getting category by ID');
    return sendInternalError(c, 'Failed to retrieve category');
  }
};

// Create a new category
export const createCategory = [
  zValidator('json', createCategorySchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid category data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const categoryData = await c.req.json();
      
      const newCategory = await categoryModel.createCategory({
        userId: userId,
        ...categoryData
      });
      
      return sendCreated(c, 'Category created successfully', newCategory);
    } catch (error) {
      logger.error({ error }, 'Error creating category');
      return sendInternalError(c, 'Failed to create category');
    }
  }
];

// Update a category
export const updateCategory = [
  zValidator('json', updateCategorySchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid category data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const categoryId = parseInt(c.req.param('id'), 10);
      const updateData = await c.req.json();
      
      if (isNaN(categoryId)) {
        return sendBadRequest(c, 'Invalid category ID');
      }
      
      // Check if category exists
      const existingCategory = await categoryModel.getCategoryById(categoryId, userId);
      
      if (!existingCategory) {
        return sendNotFound(c, 'Category not found');
      }
      
      // Update the category
      const updatedCategory = await categoryModel.updateCategory(categoryId, userId, updateData);
      
      if (!updatedCategory) {
        return sendInternalError(c, 'Failed to update category');
      }
      
      return sendUpdated(c, 'Category updated successfully', updatedCategory);
    } catch (error) {
      logger.error({ error }, 'Error updating category');
      return sendInternalError(c, 'Failed to update category');
    }
  }
];

// Delete a category
export const deleteCategory = async (c: Context) => {
  try {
    const userId = c.get('userId');
    const categoryId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(categoryId)) {
      return sendBadRequest(c, 'Invalid category ID');
    }
    
    // Check if category exists
    const existingCategory = await categoryModel.getCategoryById(categoryId, userId);
    
    if (!existingCategory) {
      return sendNotFound(c, 'Category not found');
    }
    
    // Delete the category
    const deleted = await categoryModel.deleteCategory(categoryId, userId);
    
    if (!deleted) {
      return sendInternalError(c, 'Failed to delete category');
    }
    
    return sendDeleted(c, 'Category deleted successfully');
  } catch (error) {
    logger.error({ error }, 'Error deleting category');
    return sendInternalError(c, 'Failed to delete category');
  }
}; 