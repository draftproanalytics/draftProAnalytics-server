export interface PaginationParams {
  page?: number;
  limit?: number;
  sortField?: 'gameWeek' | 'gameDate';
  sortOrder?: 1 | -1;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
