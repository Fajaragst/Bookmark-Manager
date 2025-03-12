import { z } from 'zod';
import { and, eq, asc } from 'drizzle-orm';
import db from '../db/connection';
import { categories } from '../db/schema';
import logger from '../utils/logger';

// Category schemas
export const categorySchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const categoryCreateSchema = categorySchema.omit({ id: true, createdAt: true, updatedAt: true });
export const categoryUpdateSchema = categorySchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }).partial();

// Types
export type Category = z.infer<typeof categorySchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

// Category model functions
export async function createCategory(category: CategoryCreate): Promise<Category> {
  try {
    const { userId, name, description } = category;
    
    const [newCategory] = await db.insert(categories).values({
      userId: userId,
      name,
      description: description || null,
    }).returning({
      id: categories.id,
      userId: categories.userId,
      name: categories.name,
      description: categories.description,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    });
    
    return {
      id: newCategory.id,
      userId: newCategory.userId,
      name: newCategory.name,
      description: newCategory.description || undefined,
      createdAt: newCategory.createdAt || new Date(),
      updatedAt: newCategory.updatedAt || new Date(),
    };
  } catch (error) {
    logger.error({ error }, 'Error creating category');
    throw error;
  }
}

export async function getCategoryById(id: number, userId: number): Promise<Category | null> {
  try {
    const result = await db.select()
      .from(categories)
      .where(and(
        eq(categories.id, id),
        eq(categories.userId, userId),
        eq(categories.isActive, true)
      ));
    
    if (result.length === 0) {
      return null;
    }
    
    const category = result[0];
    return {
      id: category.id,
      userId: category.userId,
      name: category.name,
      description: category.description || undefined,
      createdAt: category.createdAt || undefined,
      updatedAt: category.updatedAt || undefined
    };
  } catch (error) {
    logger.error({ error }, 'Error getting category by ID');
    throw error;
  }
}

export async function getCategoriesByUserId(userId: number): Promise<Category[]> {
  try {
    const result = await db.select()
      .from(categories)
      .where(and(
        eq(categories.userId, userId),
        eq(categories.isActive, true)
      ))
      .orderBy(asc(categories.name));
    
    return result.map(category => ({
      id: category.id,
      userId: category.userId,
      name: category.name,
      description: category.description || undefined,
      created_at: category.createdAt || undefined,
      updated_at: category.updatedAt || undefined
    }));
  } catch (error) {
    logger.error({ error }, 'Error getting categories by user ID');
    throw error;
  }
}

export async function updateCategory(id: number, userId: number, data: CategoryUpdate): Promise<Category | null> {
  try {
    const updateData: Record<string, any> = {};
    
    // Only include allowed fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    
    if (Object.keys(updateData).length === 0) {
      return await getCategoryById(id, userId);
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    const [updatedCategory] = await db.update(categories)
      .set(updateData)
      .where(and(
        eq(categories.id, id),
        eq(categories.userId, userId)
      ))
      .returning({
        id: categories.id,
        userId: categories.userId,
        name: categories.name,
        description: categories.description,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      });
    
    if (!updatedCategory) {
      return null;
    }
    
    return {
      id: updatedCategory.id,
      userId: updatedCategory.userId,
      name: updatedCategory.name,
      description: updatedCategory.description || undefined,
      createdAt: updatedCategory.createdAt || new Date(),
      updatedAt: updatedCategory.updatedAt || new Date(),
    };
  } catch (error) {
    logger.error({ error }, 'Error updating category');
    throw error;
  }
}

export async function deleteCategory(id: number, userId: number): Promise<boolean> {
  try {
    const result = await db.update(categories)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(categories.id, id),
        eq(categories.userId, userId),
        eq(categories.isActive, true)
      ));
    
    return result.count > 0;
  } catch (error) {
    logger.error({ error }, 'Error deleting category');
    throw error;
  }
} 