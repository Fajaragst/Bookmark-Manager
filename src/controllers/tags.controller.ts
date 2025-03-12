import { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as tagModel from '../models/tags.model';
import logger from '../utils/logger';
import { sendBadRequest, sendNotFound, sendInternalError, sendValidationError } from '../utils/error';
import { sendCreated, sendUpdated, sendDeleted, sendRetrieved, sendList } from '../utils/response';

// Schema for tag creation
const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

// Schema for tag update
const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Response schema for tag
const tagResponseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

type TagResponse = z.infer<typeof tagResponseSchema>;

// Transform tag model to response format
function transformTagToResponse(tag: tagModel.Tag): TagResponse {
  return {
    id: tag.id!,
    user_id: tag.userId,
    name: tag.name,
    description: tag.description,
    created_at: tag.createdAt,
    updated_at: tag.updatedAt,
  };
}

// Get all tags for the current user
export const getAllTags = async (c: Context) => {
  try {
    const userId = c.get('userId');
    
    const tags = await tagModel.getTagsByUserId(userId);
    const transformedTags = tags.map(transformTagToResponse);
    
    return sendList(c, transformedTags, transformedTags.length, 1, transformedTags.length);
  } catch (error) {
    logger.error({ error }, 'Error getting all tags');
    return sendInternalError(c, 'Failed to retrieve tags');
  }
};

// Get a single tag by ID
export const getTagById = async (c: Context) => {
  try {
    const userId = c.get('userId');
    const tagId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(tagId)) {
      return sendBadRequest(c, 'Invalid tag ID');
    }
    
    const tag = await tagModel.getTagById(tagId, userId);
    
    if (!tag) {
      return sendNotFound(c, 'Tag not found');
    }
    
    return sendRetrieved(c, transformTagToResponse(tag));
  } catch (error) {
    logger.error({ error }, 'Error getting tag by ID');
    return sendInternalError(c, 'Failed to retrieve tag');
  }
};

// Create a new tag
export const createTag = [
  zValidator('json', createTagSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid tag data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const tagData = await c.req.json();
      
      const newTag = await tagModel.createTag({
        userId,
        ...tagData
      });
      
      return sendCreated(c, 'Tag created successfully', { tag: transformTagToResponse(newTag) });
    } catch (error) {
      logger.error({ error }, 'Error creating tag');
      return sendInternalError(c, 'Failed to create tag');
    }
  }
];

// Update a tag
export const updateTag = [
  zValidator('json', updateTagSchema, (result, c: Context) => {
    if (!result.success) {
      return sendValidationError(c, 'Invalid tag data', result.error.format());
    }
  }),
  async (c: Context) => {
    try {
      const userId = c.get('userId');
      const tagId = parseInt(c.req.param('id'), 10);
      const updateData = await c.req.json();
      
      if (isNaN(tagId)) {
        return sendBadRequest(c, 'Invalid tag ID');
      }
      
      // Check if tag exists
      const existingTag = await tagModel.getTagById(tagId, userId);
      
      if (!existingTag) {
        return sendNotFound(c, 'Tag not found');
      }
      
      // Update the tag
      const updatedTag = await tagModel.updateTag(tagId, userId, updateData);
      
      if (!updatedTag) {
        return sendInternalError(c, 'Failed to update tag');
      }
      
      return sendUpdated(c, 'Tag updated successfully', { tag: transformTagToResponse(updatedTag) });
    } catch (error) {
      logger.error({ error }, 'Error updating tag');
      return sendInternalError(c, 'Failed to update tag');
    }
  }
];

// Delete a tag
export const deleteTag = async (c: Context) => {
  try {
    const userId = c.get('userId');
    const tagId = parseInt(c.req.param('id'), 10);
    
    if (isNaN(tagId)) {
      return sendBadRequest(c, 'Invalid tag ID');
    }
    
    // Check if tag exists
    const existingTag = await tagModel.getTagById(tagId, userId);
    
    if (!existingTag) {
      return sendNotFound(c, 'Tag not found');
    }
    
    // Delete the tag
    const deleted = await tagModel.deleteTag(tagId, userId);
    
    if (!deleted) {
      return sendInternalError(c, 'Failed to delete tag');
    }
    
    return sendDeleted(c, 'Tag deleted successfully');
  } catch (error) {
    logger.error({ error }, 'Error deleting tag');
    return sendInternalError(c, 'Failed to delete tag');
  }
}; 