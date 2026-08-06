import { Injectable } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../../common/errors';
import { ListResult, toPagination } from '../../common/dto/list-request.dto';
import { normalizePhone, phoneToDigits } from '../../common/phone';
import { OUTBOX_ENTITY } from '../../infrastructure/outbox/outbox.types';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { AnalyticsReadRepository } from '../analytics/analytics-read.repository';
import { toUserResponse, toUserSnapshot, UserResponse } from './user.mapper';
import { UsersRepository } from './users.repository';
import { FetchUsersDto, UpdateUserDto } from './dto/users.dto';
import { UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly readModel: AnalyticsReadRepository,
    private readonly outbox: OutboxService,
  ) {}

  /** List is served from the denormalized ClickHouse table. */
  async fetchMany(dto: FetchUsersDto): Promise<ListResult<UserResponse>> {
    const { limit, offset } = toPagination(dto);
    return this.readModel.listUsers({
      limit,
      offset,
      sortOrder: dto.sortOrder,
      sortBy: dto.sortBy,
      search: (dto.search ?? '').trim(),
      isActive: dto.isActive ?? null,
    });
  }

  /** Single entity always comes from the source of truth. */
  async fetchOne(mongoId: string): Promise<UserResponse> {
    return toUserResponse(await this.requireUser(mongoId));
  }

  async update(mongoId: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.requireUser(mongoId);

    const patch: { name?: string; phone?: string; phoneDigits?: string } = {};

    if (dto.name !== undefined) patch.name = dto.name.trim();

    if (dto.phone !== undefined) {
      const phone = normalizePhone(dto.phone);
      if (!phone) throw BusinessException.badRequest(ErrorCode.PHONE_INVALID);
      if (phone !== user.phone) {
        const owner = await this.users.findByPhone(phone);
        if (owner) throw BusinessException.conflict(ErrorCode.PHONE_TAKEN);
      }
      patch.phone = phone;
      patch.phoneDigits = phoneToDigits(phone);
    }

    const updated = (await this.users.update(mongoId, patch)) ?? user;
    await this.publish(updated);
    return toUserResponse(updated);
  }

  async setActive(
    mongoId: string,
    isActive: boolean,
    currentUserId: string,
  ): Promise<UserResponse> {
    await this.requireUser(mongoId);
    if (!isActive && mongoId === currentUserId) {
      throw BusinessException.conflict(ErrorCode.CANNOT_DEACTIVATE_SELF);
    }
    const updated = await this.users.setActive(mongoId, isActive);
    if (!updated) throw BusinessException.notFound(ErrorCode.USER_NOT_FOUND);
    await this.publish(updated);
    return toUserResponse(updated);
  }

  private async requireUser(mongoId: string): Promise<UserDocument> {
    const user = await this.users.findById(mongoId);
    if (!user) throw BusinessException.notFound(ErrorCode.USER_NOT_FOUND);
    return user;
  }

  /** Mongo first, ClickHouse afterwards through the outbox. */
  private async publish(user: UserDocument): Promise<void> {
    await this.outbox.enqueue({
      entityType: OUTBOX_ENTITY.user,
      entityId: user.id as string,
      payload: toUserSnapshot(user),
    });
  }
}
