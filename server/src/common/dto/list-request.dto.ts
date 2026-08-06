import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_PAGE_INDEX = 0;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Shared body of every `POST <entity>/fetch/many` endpoint.
 * Unknown properties are rejected with 400 by the global validation pipe.
 */
export class ListRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  pageIndex: number = DEFAULT_PAGE_INDEX;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'desc';
}

export interface ListResult<T> {
  data: T[];
  totalCount: number;
}

export interface Pagination {
  limit: number;
  offset: number;
}

export function toPagination(dto: ListRequestDto): Pagination {
  const pageSize = dto.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageIndex = dto.pageIndex ?? DEFAULT_PAGE_INDEX;
  return { limit: pageSize, offset: pageIndex * pageSize };
}
