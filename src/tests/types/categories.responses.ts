import { ErrorResponse, PaginationResponse } from './common.responses';

export interface CategoryData {
  id: number;
  name: string;
  description?: string;
  userId?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryListResponse {
  message?: string;
  data?: {
    items?: CategoryData[];
    pagination?: PaginationResponse;
  };
  error?: ErrorResponse;
}

export interface CategoryDetailResponse {
  message?: string;
  data?: CategoryData;
  error?: ErrorResponse;
} 