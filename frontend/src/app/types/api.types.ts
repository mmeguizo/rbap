export interface PaginatedMeta {
  total: number;
  take: number;
  skip: number;
  returned: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}
