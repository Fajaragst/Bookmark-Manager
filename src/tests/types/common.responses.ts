import { ErrorType } from '../../utils/error';

export interface ErrorResponse {
  type: ErrorType;
  message: string;
  details?: unknown;
}

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
} 