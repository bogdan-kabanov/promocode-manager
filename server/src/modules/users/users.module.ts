import { Module } from '@nestjs/common';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { AnalyticsReadModule } from '../analytics/analytics-read.module';
import { UsersRepositoryModule } from './users-repository.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [UsersRepositoryModule, AnalyticsReadModule, OutboxModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
