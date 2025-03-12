import { z } from 'zod';
import { and, eq, ilike, or, sql, desc, asc, SQL, inArray } from 'drizzle-orm';
import db from '../db/connection';
import { bookmarks, categories, bookmarkTags, tags } from '../db/schema';
import logger from '../utils/logger';
import * as tagModel from './tags.model';

// Bookmark schemas
export const bookmarkSchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  categoryId: z.number().nullable().optional(),
  title: z.string().min(1).max(100),
  url: z.string().url().min(1),
  description: z.string().max(500).optional(),
  favorite: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const bookmarkCreateSchema = bookmarkSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true
});

export const bookmarkUpdateSchema = bookmarkSchema.omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  updatedAt: true 
}).partial();

export const bookmarkWithCategorySchema = bookmarkSchema.extend({
  categoryName: z.string().optional(),
  tags: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })).optional(),
});

// Types
export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarkCreate = z.infer<typeof bookmarkCreateSchema>;
export type BookmarkUpdate = z.infer<typeof bookmarkUpdateSchema>;
export type BookmarkWithCategory = z.infer<typeof bookmarkWithCategorySchema>;

// Helper function to process tags
async function processBookmarkTags(bookmarkId: number, userId: number, tagNames: string[]): Promise<void> {
  try {
    // Get or create tags
    const tagPromises = tagNames.map(async (name) => {
      // Try to find existing tag
      const existingTags = await db.select()
        .from(tags)
        .where(and(
          eq(tags.userId, userId),
          eq(tags.name, name),
          eq(tags.isActive, true)
        ));

      if (existingTags.length > 0) {
        return existingTags[0];
      }

      // Create new tag if it doesn't exist
      const [newTag] = await db.insert(tags)
        .values({
          userId,
          name,
        })
        .returning();

      return newTag;
    });

    const resolvedTags = await Promise.all(tagPromises);

    // Add tags to bookmark
    await Promise.all(
      resolvedTags.map(tag => 
        db.insert(bookmarkTags)
          .values({
            bookmarkId,
            tagId: tag.id,
          })
          .onConflictDoNothing()
      )
    );
  } catch (error) {
    logger.error({ error }, 'Error processing bookmark tags');
    throw error;
  }
}

// Bookmark model functions
export async function createBookmark(bookmark: BookmarkCreate): Promise<Bookmark> {
  try {
    const { tags: tagNames, ...bookmarkData } = bookmark;
    
    // Insert the bookmark
    const [insertedBookmark] = await db.insert(bookmarks)
      .values({
        userId: bookmark.userId,
        categoryId: bookmark.categoryId || null,
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || null,
        favorite: bookmark.favorite === undefined ? false : bookmark.favorite
      })
      .returning({
        id: bookmarks.id,
        userId: bookmarks.userId,
        categoryId: bookmarks.categoryId,
        title: bookmarks.title,
        url: bookmarks.url,
        description: bookmarks.description,
        favorite: bookmarks.favorite,
        createdAt: bookmarks.createdAt,
        updatedAt: bookmarks.updatedAt
      });
    
    // Process tags if provided
    if (tagNames && tagNames.length > 0) {
      await processBookmarkTags(insertedBookmark.id, insertedBookmark.userId, tagNames);
    }
    
    // Convert null to appropriate values for the return type
    return {
      ...insertedBookmark,
      favorite: insertedBookmark.favorite === null ? false : insertedBookmark.favorite,
      description: insertedBookmark.description || undefined,
      createdAt: insertedBookmark.createdAt || undefined,
      updatedAt: insertedBookmark.updatedAt || undefined,
      tags: tagNames
    };
  } catch (error) {
    logger.error({ error }, 'Error creating bookmark');
    throw error;
  }
}

export async function getBookmarkById(id: number | undefined, userId: number): Promise<BookmarkWithCategory | null> {
  try {
    // If id is undefined, return null
    if (id === undefined) {
      return null;
    }
    
    // Get the bookmark with category name
    const result = await db.select({
      id: bookmarks.id,
      userId: bookmarks.userId,
      category: {
        id: categories.id,
        name: categories.name
      },
      title: bookmarks.title,
      url: bookmarks.url,
      description: bookmarks.description,
      favorite: bookmarks.favorite,
      isActive: bookmarks.isActive,
      createdAt: bookmarks.createdAt,
      updatedAt: bookmarks.updatedAt,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(
      eq(bookmarks.id, id),
      eq(bookmarks.userId, userId),
      eq(bookmarks.isActive, true)
    ));
    
    if (result.length === 0) {
      return null;
    }
    
    const bookmark = result[0];
    
    // Get tags for the bookmark
    const bookmarkTags = await tagModel.getBookmarkTags(id);
    
    return {
      ...bookmark,
      favorite: bookmark.favorite === null ? false : bookmark.favorite,
      description: bookmark.description || undefined,
      createdAt: bookmark.createdAt || undefined,
      updatedAt: bookmark.updatedAt || undefined,
      tags: bookmarkTags.filter(tag => tag.id !== undefined).map(tag => ({ 
        id: tag.id as number, 
        name: tag.name 
      }))
    };
  } catch (error) {
    logger.error({ error }, 'Error getting bookmark by ID');
    throw error;
  }
}

export async function getBookmarksByUserId(
  userId: number, 
  options: { 
    categoryId?: number, 
    favorite?: boolean, 
    query?: string,
    tagId?: number,
    limit?: number,
    offset?: number,
    sortBy?: 'title' | 'createdAt' | 'updatedAt',
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<{ bookmarks: BookmarkWithCategory[], total: number }> {
  try {
    const { 
      categoryId, 
      favorite, 
      query,
      tagId,
      limit = 10, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    // Build the where conditions
    const conditions = [
      eq(bookmarks.userId, userId),
      eq(bookmarks.isActive, true)
    ];
    
    if (categoryId !== undefined) {
      conditions.push(eq(bookmarks.categoryId, categoryId));
    }
    
    if (favorite !== undefined) {
      conditions.push(eq(bookmarks.favorite, favorite));
    }
    
    if (query) {
      conditions.push(
        sql`(${bookmarks.title} ILIKE ${'%' + query + '%'} OR ${bookmarks.description} ILIKE ${'%' + query + '%'})`
      );
    }
    
    // Add tag condition if specified
    let tagJoin = undefined;
    if (tagId !== undefined) {
      tagJoin = db.select()
        .from(bookmarkTags)
        .where(eq(bookmarkTags.tagId, tagId))
        .as('tag_filter');
      conditions.push(sql`${bookmarks.id} IN (SELECT ${tagJoin}.bookmark_id FROM ${tagJoin})`);
    }
    
    // Get total count
    const countResult = await db.select({
      count: sql<number>`count(*)`
    })
    .from(bookmarks)
    .where(and(...conditions));
    
    const total = countResult[0].count;
    
    // Build the order by clause
    const orderByField = sortBy === 'title' ? bookmarks.title : 
                         sortBy === 'updatedAt' ? bookmarks.updatedAt : 
                         bookmarks.createdAt;
    
    const orderByFn = sortOrder === 'asc' ? asc : desc;
    
    // Get bookmarks with pagination
    const bookmarksResult = await db.select({
      id: bookmarks.id,
      userId: bookmarks.userId,
      category: {
        id: categories.id,
        name: categories.name
      },
      title: bookmarks.title,
      url: bookmarks.url,
      description: bookmarks.description,
      favorite: bookmarks.favorite,
      isActive: bookmarks.isActive,
      createdAt: bookmarks.createdAt,
      updatedAt: bookmarks.updatedAt,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderByFn(orderByField))
    .limit(limit)
    .offset(offset);
    
    // Get tags for all bookmarks
    const bookmarkIds = bookmarksResult.map(b => b.id);
    
    // Only fetch tags if we have bookmarks
    let allTags: { bookmarkId: number; tagId: number; tagName: string }[] = [];
    if (bookmarkIds.length > 0) {
      allTags = await db.select({
        bookmarkId: bookmarkTags.bookmarkId,
        tagId: tags.id,
        tagName: tags.name
      })
      .from(bookmarkTags)
      .innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .where(and(
        inArray(bookmarkTags.bookmarkId, bookmarkIds),
        eq(tags.isActive, true)
      ));
    }
    
    // Group tags by bookmark
    const tagsByBookmark = allTags.reduce((acc, { bookmarkId, tagId, tagName }) => {
      if (!acc[bookmarkId]) {
        acc[bookmarkId] = [];
      }
      acc[bookmarkId].push({ id: tagId, name: tagName });
      return acc;
    }, {} as Record<number, Array<{ id: number, name: string }>>);
    
    // Format the results
    const bookmarksWithCategory = bookmarksResult.map(bookmark => ({
      ...bookmark,
      favorite: bookmark.favorite === null ? false : bookmark.favorite,
      description: bookmark.description || undefined,
      tags: tagsByBookmark[bookmark.id] || [],
      createdAt: bookmark.createdAt || undefined,
      updatedAt: bookmark.updatedAt || undefined,
    }));
    
    return { bookmarks: bookmarksWithCategory, total };
  } catch (error) {
    logger.error({ error }, 'Error getting bookmarks by user ID');
    throw error;
  }
}

export async function updateBookmark(
  id: number | undefined, 
  userId: number, 
  data: BookmarkUpdate
): Promise<BookmarkWithCategory | null> {
  try {
    // If id is undefined, return null
    if (id === undefined) {
      return null;
    }

    // Check if bookmark exists and belongs to user
    const existingBookmark = await db.select()
      .from(bookmarks)
      .where(and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, userId)
      ));
    
    if (existingBookmark.length === 0) {
      return null;
    }
    
    const { tags: tagNames, ...updateData } = data;
    
    // Update bookmark if there are fields to update
    if (Object.keys(updateData).length > 0) {
      await db.update(bookmarks)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(and(
          eq(bookmarks.id, id),
          eq(bookmarks.userId, userId)
        ));
    }
    
    // Update tags if provided
    if (tagNames !== undefined) {
      // Remove existing tags
      await db.delete(bookmarkTags)
        .where(eq(bookmarkTags.bookmarkId, id));
      
      // Add new tags
      if (tagNames.length > 0) {
        await processBookmarkTags(id, userId, tagNames);
      }
    }
    
    // Return updated bookmark
    return await getBookmarkById(id, userId);
  } catch (error) {
    logger.error({ error }, 'Error updating bookmark');
    throw error;
  }
}

export async function deleteBookmark(id: number, userId: number): Promise<boolean> {
  try {
    const result = await db.update(bookmarks)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(bookmarks.id, id),
        eq(bookmarks.userId, userId),
        eq(bookmarks.isActive, true)
      ));
    
    return result.count > 0;
  } catch (error) {
    logger.error({ error }, 'Error deleting bookmark');
    throw error;
  }
} 