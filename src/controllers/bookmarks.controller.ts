import { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as bookmarkModel from '../models/bookmarks.model';
import logger from '../utils/logger';
import { 
  sendBadRequest, 
  sendNotFound, 
  sendInternalError, 
  sendValidationError 
} from '../utils/error';
import { sendCreated, sendUpdated, sendDeleted, sendRetrieved, sendList } from '../utils/response';

// Schema for bookmark creation
const createBookmarkSchema = z.object({
  categoryId: z.number().nullable().optional(),
  title: z.string().min(1).max(100),
  url: z.string().url().min(1),
  description: z.string().max(500).optional(),
  favorite: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

// Schema for bookmark update
const updateBookmarkSchema = z.object({
  categoryId: z.number().nullable().optional(),
  title: z.string().min(1).max(100).optional(),
  url: z.string().url().min(1).optional(),
  description: z.string().max(500).optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Schema for bookmark filtering
const getBookmarksQuerySchema = z.object({
  categoryId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  tag_id: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  favorite: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 10),
  sort_by: z.enum(['title', 'created_at', 'updated_at']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Get all bookmarks for the current user
export const getBookmarks = [
  zValidator('query', getBookmarksQuerySchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid query parameters', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const query = c.req.query();
      
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '10');
      
      // Map sort_by to match the model's expected format
      const sortByMap = {
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'title': 'title'
      } as const;
      
      const { bookmarks, total } = await bookmarkModel.getBookmarksByUserId(userId, {
        limit,
        offset: (page - 1) * limit,
        categoryId: query.categoryId ? parseInt(query.categoryId) : undefined,
        tagId: query.tag_id ? parseInt(query.tag_id) : undefined,
        favorite: query.favorite ? query.favorite === 'true' : undefined,
        query: query.search,
        sortBy: query.sort_by ? sortByMap[query.sort_by as keyof typeof sortByMap] : undefined,
        sortOrder: query.sort_order as 'asc' | 'desc' | undefined,
      });
      
      return sendList(c, bookmarks, total, page, limit);
    } catch (error) {
      logger.error({ error }, 'Error getting bookmarks');
      return sendInternalError(c, 'Failed to retrieve bookmarks');
    }
  }
];

// Get a single bookmark by ID
export const getBookmarkById = async (c: Context) => {
  try {
    const userId = c.get('userId');
    const bookmarkId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(bookmarkId)) {
      return sendBadRequest(c, 'Invalid bookmark ID');
    }
    
    const bookmark = await bookmarkModel.getBookmarkById(bookmarkId, userId);
    
    if (!bookmark) {
      return sendNotFound(c, 'Bookmark not found');
    }

    return sendRetrieved(c, bookmark );
  } catch (error) {
    logger.error({ error }, 'Error getting bookmark by ID');
    return sendInternalError(c, 'Failed to retrieve bookmark');
  }
};

// Create a new bookmark
export const createBookmark = [
  zValidator('json', createBookmarkSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid bookmark data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const bookmarkData = await c.req.json();
      
      // Create the bookmark
      const newBookmark = await bookmarkModel.createBookmark({
        userId,
        categoryId: bookmarkData.categoryId,
        title: bookmarkData.title,
        url: bookmarkData.url,
        description: bookmarkData.description,
        favorite: bookmarkData.favorite,
        tags: bookmarkData.tags
      });
      
      // Get the complete bookmark with category
      let bookmarkWithCategory = null;
      if (newBookmark.id !== undefined) {
        bookmarkWithCategory = await bookmarkModel.getBookmarkById(newBookmark.id, userId);
      }
      
      if (!bookmarkWithCategory) {
        return sendInternalError(c, 'Failed to retrieve created bookmark');
      }
      
      return sendCreated(c, 'Bookmark created successfully', bookmarkWithCategory );
    } catch (error) {
      logger.error({ error }, 'Error creating bookmark');
      
      // Provide more detailed error message for debugging
      if (error instanceof Error) {
        return sendInternalError(c, `Failed to create bookmark: ${error.message}`);
      }
      
      return sendInternalError(c, 'Failed to create bookmark');
    }
  }
];

// Update a bookmark
export const updateBookmark = [
  zValidator('json', updateBookmarkSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid bookmark data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const bookmarkId = parseInt(c.req.param('id'), 10);
      const updateData = await c.req.json();
      
      if (isNaN(bookmarkId)) {
        return sendBadRequest(c, 'Invalid bookmark ID');
      }
      
      // Check if bookmark exists
      const existingBookmark = await bookmarkModel.getBookmarkById(bookmarkId, userId);
      
      if (!existingBookmark) {
        return sendNotFound(c, 'Bookmark not found');
      }
      
      // Update the bookmark
      const updatedBookmark = await bookmarkModel.updateBookmark(
        bookmarkId, 
        userId, 
        {
          categoryId: updateData.categoryId,
          title: updateData.title,
          url: updateData.url,
          description: updateData.description,
          favorite: updateData.favorite,
          tags: updateData.tags
        }
      );
      
      if (!updatedBookmark) {
        return sendInternalError(c, 'Failed to update bookmark');
      }
      
      return sendUpdated(c, 'Bookmark updated successfully', updatedBookmark );
    } catch (error) {
      logger.error({ error }, 'Error updating bookmark');
      
      // Provide more detailed error message for debugging
      if (error instanceof Error) {
        return sendInternalError(c, `Failed to update bookmark: ${error.message}`);
      }
      
      return sendInternalError(c, 'Failed to update bookmark');
    }
  }
];

// Delete a bookmark
export const deleteBookmark = async (c: Context) => {
  try {
    const userId = c.get('userId');
    const bookmarkId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(bookmarkId)) {
      return sendBadRequest(c, 'Invalid bookmark ID');
    }
    
    // Check if bookmark exists
    const existingBookmark = await bookmarkModel.getBookmarkById(bookmarkId, userId);
    
    if (!existingBookmark) {
      return sendNotFound(c, 'Bookmark not found');
    }
    
    // Delete the bookmark
    const deleted = await bookmarkModel.deleteBookmark(bookmarkId, userId);
    
    if (!deleted) {
      return sendInternalError(c, 'Failed to delete bookmark');
    }
    
    return sendDeleted(c, 'Bookmark deleted successfully');
  } catch (error) {
    logger.error({ error }, 'Error deleting bookmark');
    return sendInternalError(c, 'Failed to delete bookmark');
  }
}; 