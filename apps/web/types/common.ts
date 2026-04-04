export type PaginationResponse<T> = {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isSuccess: boolean;
  statusCode: number;
  message: string;
};
