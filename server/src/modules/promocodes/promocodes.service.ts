import { Injectable } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../../common/errors';
import { parseIsoDate } from '../../common/datetime';
import { ListResult, toPagination } from '../../common/dto/list-request.dto';
import { OUTBOX_ENTITY } from '../../infrastructure/outbox/outbox.types';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { AnalyticsReadRepository } from '../analytics/analytics-read.repository';
import { PromoCodeDocument } from './promocode.schema';
import { PromocodeResponse, toPromocodeResponse, toPromocodeSnapshot } from './promocode.mapper';
import { PromocodesRepository, UpdatePromocodeInput } from './promocodes.repository';
import {
  CreatePromocodeDto,
  FetchPromocodesDto,
  UpdatePromocodeDto,
} from './dto/promocodes.dto';

/** Codes are stored uppercase and trimmed. */
export function normalizePromocode(code: string): string {
  return code.trim().toUpperCase();
}

@Injectable()
export class PromocodesService {
  constructor(
    private readonly promocodes: PromocodesRepository,
    private readonly readModel: AnalyticsReadRepository,
    private readonly outbox: OutboxService,
  ) {}

  async fetchMany(dto: FetchPromocodesDto): Promise<ListResult<PromocodeResponse>> {
    const { limit, offset } = toPagination(dto);
    return this.readModel.listPromocodes({
      limit,
      offset,
      sortOrder: dto.sortOrder,
      sortBy: dto.sortBy,
      search: (dto.search ?? '').trim(),
      state: dto.state ?? null,
    });
  }

  async fetchOne(mongoId: string): Promise<PromocodeResponse> {
    return toPromocodeResponse(await this.requirePromocode(mongoId));
  }

  async create(dto: CreatePromocodeDto): Promise<PromocodeResponse> {
    const code = normalizePromocode(dto.code);
    if (await this.promocodes.findByCode(code)) {
      throw BusinessException.conflict(ErrorCode.CODE_DUPLICATE);
    }

    const created = await this.promocodes.create({
      code,
      discountPercent: dto.discountPercent,
      maxUsagesTotal: dto.maxUsagesTotal ?? null,
      maxUsagesPerUser: dto.maxUsagesPerUser ?? null,
      validFrom: dto.validFrom ? parseIsoDate(dto.validFrom) : null,
      validUntil: dto.validUntil ? parseIsoDate(dto.validUntil) : null,
    });

    await this.publish(created);
    return toPromocodeResponse(created);
  }

  async update(mongoId: string, dto: UpdatePromocodeDto): Promise<PromocodeResponse> {
    const promocode = await this.requirePromocode(mongoId);

    const patch: UpdatePromocodeInput = {};
    if (dto.discountPercent !== undefined) patch.discountPercent = dto.discountPercent;
    if (dto.maxUsagesTotal !== undefined) patch.maxUsagesTotal = dto.maxUsagesTotal;
    if (dto.maxUsagesPerUser !== undefined) patch.maxUsagesPerUser = dto.maxUsagesPerUser;
    if (dto.validFrom !== undefined) {
      patch.validFrom = dto.validFrom === null ? null : parseIsoDate(dto.validFrom);
    }
    if (dto.validUntil !== undefined) {
      patch.validUntil = dto.validUntil === null ? null : parseIsoDate(dto.validUntil);
    }

    const updated = (await this.promocodes.update(mongoId, patch)) ?? promocode;
    await this.publish(updated);
    return toPromocodeResponse(updated);
  }

  async setActive(mongoId: string, isActive: boolean): Promise<PromocodeResponse> {
    await this.requirePromocode(mongoId);
    const updated = await this.promocodes.setActive(mongoId, isActive);
    if (!updated) throw BusinessException.notFound(ErrorCode.PROMOCODE_NOT_FOUND);
    await this.publish(updated);
    return toPromocodeResponse(updated);
  }

  private async requirePromocode(mongoId: string): Promise<PromoCodeDocument> {
    const promocode = await this.promocodes.findById(mongoId);
    if (!promocode) throw BusinessException.notFound(ErrorCode.PROMOCODE_NOT_FOUND);
    return promocode;
  }

  private async publish(promocode: PromoCodeDocument): Promise<void> {
    await this.outbox.enqueue({
      entityType: OUTBOX_ENTITY.promocode,
      entityId: promocode.id as string,
      payload: toPromocodeSnapshot(promocode),
    });
  }
}
