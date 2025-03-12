import { ErrorResponse, PaginationResponse } from './common.responses';

export interface BookmarkCategory {
  id: number;
  name: string;
}

export interface BookmarkTag {
  id: number;
  name: string;
}

export interface BookmarkData {
  id: number;
  title: string;
  url: string;
  description?: string;
  favorite: boolean;
  categoryId?: number;
  userId?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  category?: BookmarkCategory;
  tags?: BookmarkTag[];
}

export interface BookmarkListResponse {
  message?: string;
  data?: {
    items?: BookmarkData[];
    pagination?: PaginationResponse;
  };
  error?: ErrorResponse;
}

export interface BookmarkDetailResponse {
  message?: string;
  data?: BookmarkData;
  error?: ErrorResponse;
} 