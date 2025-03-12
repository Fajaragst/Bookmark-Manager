import { z } from 'zod';
import { and, eq, ilike, or, sql, desc, asc } from 'drizzle-orm';
import db from '../db/connection';
import { tags, bookmarkTags } from '../db/schema';
import logger from '../utils/logger';

// Tag schemas
export const tagSchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const tagCreateSchema = tagSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const tagUpdateSchema = tagSchema.omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  updatedAt: true 
}).partial();

// Types
export type Tag = z.infer<typeof tagSchema>;
export type TagCreate = z.infer<typeof tagCreateSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;

// Tag model functions
export async function createTag(tag: TagCreate): Promise<Tag> {
  try {
    const [newTag] = await db.insert(tags).values({
      userId: tag.userId,
      name: tag.name,
      description: tag.description || null,
    }).returning({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      description: tags.description,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    });
    
    return {
      ...newTag,
      description: newTag.description || undefined,
      createdAt: newTag.createdAt || undefined,
      updatedAt: newTag.updatedAt || undefined,
    };
  } catch (error) {
    logger.error({ error }, 'Error creating tag');
    throw error;
  }
}

export async function getTagById(id: number, userId: number): Promise<Tag | null> {
  try {
    const result = await db.select()
      .from(tags)
      .where(and(
        eq(tags.id, id),
        eq(tags.userId, userId),
        eq(tags.isActive, true)
      ));
    
    if (result.length === 0) {
      return null;
    }
    
    const tag = result[0];
    return {
      id: tag.id,
      userId: tag.userId,
      name: tag.name,
      description: tag.description || undefined,
      createdAt: tag.createdAt || undefined,
      updatedAt: tag.updatedAt || undefined,
    };
  } catch (error) {
    logger.error({ error }, 'Error getting tag by ID');
    throw error;
  }
}

export async function getTagsByUserId(userId: number): Promise<Tag[]> {
  try {
    const result = await db.select()
      .from(tags)
      .where(and(
        eq(tags.userId, userId),
        eq(tags.isActive, true)
      ))
      .orderBy(asc(tags.name));
    
    return result.map(tag => ({
      id: tag.id,
      userId: tag.userId,
      name: tag.name,
      description: tag.description || undefined,
      createdAt: tag.createdAt || undefined,
      updatedAt: tag.updatedAt || undefined,
    }));
  } catch (error) {
    logger.error({ error }, 'Error getting tags by user ID');
    throw error;
  }
}

export async function updateTag(id: number, userId: number, data: TagUpdate): Promise<Tag | null> {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    
    if (Object.keys(updateData).length === 0) {
      return await getTagById(id, userId);
    }
    
    updateData.updatedAt = new Date();
    
    const [updatedTag] = await db.update(tags)
      .set(updateData)
      .where(and(
        eq(tags.id, id),
        eq(tags.userId, userId),
        eq(tags.isActive, true)
      ))
      .returning({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        description: tags.description,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      });
    
    if (!updatedTag) {
      return null;
    }
    
    return {
      ...updatedTag,
      description: updatedTag.description || undefined,
      createdAt: updatedTag.createdAt || undefined,
      updatedAt: updatedTag.updatedAt || undefined,
    };
  } catch (error) {
    logger.error({ error }, 'Error updating tag');
    throw error;
  }
}

export async function deleteTag(id: number, userId: number): Promise<boolean> {
  try {
    const result = await db.update(tags)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(tags.id, id),
        eq(tags.userId, userId),
        eq(tags.isActive, true)
      ));
    
    return result.count > 0;
  } catch (error) {
    logger.error({ error }, 'Error deleting tag');
    throw error;
  }
}

// Tag association functions
export async function addTagToBookmark(bookmarkId: number, tagId: number): Promise<void> {
  try {
    await db.insert(bookmarkTags)
      .values({
        bookmarkId,
        tagId,
      })
      .onConflictDoNothing();
  } catch (error) {
    logger.error({ error }, 'Error adding tag to bookmark');
    throw error;
  }
}

export async function removeTagFromBookmark(bookmarkId: number, tagId: number): Promise<void> {
  try {
    await db.delete(bookmarkTags)
      .where(and(
        eq(bookmarkTags.bookmarkId, bookmarkId),
        eq(bookmarkTags.tagId, tagId)
      ));
  } catch (error) {
    logger.error({ error }, 'Error removing tag from bookmark');
    throw error;
  }
}

export async function getBookmarkTags(bookmarkId: number): Promise<Tag[]> {
  try {
    const result = await db.select({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      description: tags.description,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(bookmarkTags)
    .innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
    .where(and(
      eq(bookmarkTags.bookmarkId, bookmarkId),
      eq(tags.isActive, true)
    ))
    .orderBy(asc(tags.name));
    
    return result.map(tag => ({
      id: tag.id,
      userId: tag.userId,
      name: tag.name,
      description: tag.description || undefined,
      createdAt: tag.createdAt || undefined,
      updatedAt: tag.updatedAt || undefined,
    }));
  } catch (error) {
    logger.error({ error }, 'Error getting bookmark tags');
    throw error;
  }
} 