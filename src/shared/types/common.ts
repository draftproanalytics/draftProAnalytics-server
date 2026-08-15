export interface PaginationParams {
  page?: number;
  limit?: number;
  sortField?:
    | 'gameWeek'
    | 'gameDate'
    | 'name'
    | 'city'
    | 'state'
    | 'conference'
    | 'division'
    | 'stadium'
    | 'firstName'
    | 'lastName'
    | 'position'
    | 'university';
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
