import { IsISO8601, IsOptional } from 'class-validator';
import { BusinessException, ErrorCode } from '../errors';
import { parseIsoDate } from '../datetime';
import { ListRequestDto } from './list-request.dto';

/**
 * `dateFrom` / `dateTo` are accepted ONLY by `/analytics/*` endpoints.
 * The range is half-open: [dateFrom, dateTo).
 */
export class AnalyticsListRequestDto extends ListRequestDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/** Wide-open defaults keep "no filter" and "filter" on the same query shape. */
const MIN_DATE = new Date('1970-01-01T00:00:00.000Z');
const MAX_DATE = new Date('2999-12-31T23:59:59.999Z');

export function resolveDateRange(dto: AnalyticsListRequestDto): DateRange {
  const from = dto.dateFrom ? parseIsoDate(dto.dateFrom) : null;
  const to = dto.dateTo ? parseIsoDate(dto.dateTo) : null;
  if (from && to && from.getTime() > to.getTime()) {
    throw BusinessException.badRequest(ErrorCode.DATE_RANGE_INVALID);
  }
  return { from: from ?? MIN_DATE, to: to ?? MAX_DATE };
}
