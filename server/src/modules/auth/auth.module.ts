import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { UsersRepositoryModule } from '../users/users-repository.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenStore } from './refresh-token.store';

@Module({
  imports: [JwtModule.register({}), UsersRepositoryModule, OutboxModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenStore,
    JwtAuthGuard,
    // Registered here so the guard resolves UsersRepository from this context.
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
