import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AppConfigModule } from './config/config.module';
import { APP_CONFIG, AppConfig } from './config/configuration';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SyncModule } from './infrastructure/sync/sync.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PromocodesModule } from './modules/promocodes/promocodes.module';
import { UsersModule } from './modules/users/users.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ uri: config.mongoUri }),
    }),
    RedisModule,
    SyncModule,
    AuthModule,
    UsersModule,
    PromocodesModule,
    OrdersModule,
    AnalyticsModule,
    HealthModule,
    SeedModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
