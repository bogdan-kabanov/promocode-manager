import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { APP_CONFIG, AppConfig } from '../../config/configuration';
import { BusinessException, ErrorCode } from '../../common/errors';
import { normalizePhone, phoneToDigits } from '../../common/phone';
import { OUTBOX_ENTITY } from '../../infrastructure/outbox/outbox.types';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { UsersRepository } from '../users/users.repository';
import { toUserResponse, toUserSnapshot, UserResponse } from '../users/user.mapper';
import { RefreshTokenStore } from './refresh-token.store';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: UserResponse;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenStore,
    private readonly outbox: OutboxService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw BusinessException.badRequest(ErrorCode.PHONE_INVALID);

    if (await this.users.findByPhone(phone)) {
      throw BusinessException.conflict(ErrorCode.PHONE_TAKEN);
    }

    const passwordHash = await bcrypt.hash(dto.password, this.config.bcryptRounds);
    const created = await this.users.create({
      phone,
      phoneDigits: phoneToDigits(phone),
      name: dto.name.trim(),
      passwordHash,
    });

    await this.outbox.enqueue({
      entityType: OUTBOX_ENTITY.user,
      entityId: created.id as string,
      payload: toUserSnapshot(created),
    });

    const tokens = await this.issueTokens(created.id as string, created.phone);
    return { ...tokens, user: toUserResponse(created) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const phone = normalizePhone(dto.phone);
    if (!phone) throw BusinessException.unauthorized(ErrorCode.INVALID_CREDENTIALS);

    const user = await this.users.findByPhone(phone);
    if (!user) throw BusinessException.unauthorized(ErrorCode.INVALID_CREDENTIALS);
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw BusinessException.unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }
    if (!user.isActive) throw BusinessException.unauthorized(ErrorCode.USER_DISABLED);

    const tokens = await this.issueTokens(user.id as string, user.phone);
    return { ...tokens, user: toUserResponse(user) };
  }

  async refresh(dto: RefreshDto): Promise<AuthResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(dto.refreshToken, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      throw BusinessException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID);
    }
    if (payload.type !== 'refresh') {
      throw BusinessException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    // Single use: the stored hash is removed atomically here.
    const accepted = await this.refreshTokens.consume(payload.sub, payload.jti, dto.refreshToken);
    if (!accepted) throw BusinessException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID);

    const user = await this.users.findById(payload.sub);
    if (!user) throw BusinessException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID);
    if (!user.isActive) throw BusinessException.unauthorized(ErrorCode.USER_DISABLED);

    const tokens = await this.issueTokens(user.id as string, user.phone);
    return { ...tokens, user: toUserResponse(user) };
  }

  private async issueTokens(userId: string, phone: string): Promise<AuthTokens> {
    const accessPayload: AccessTokenPayload = { sub: userId, phone, type: 'access' };
    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.jwt.accessSecret,
      expiresIn: this.config.jwt.accessTtlSeconds,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.jwt.refreshSecret,
      expiresIn: this.config.jwt.refreshTtlSeconds,
    });

    await this.refreshTokens.remember(
      userId,
      jti,
      refreshToken,
      this.config.jwt.refreshTtlSeconds,
    );

    return { accessToken, refreshToken, expiresIn: this.config.jwt.accessTtlSeconds };
  }
}
