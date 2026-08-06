import { Global, Module } from '@nestjs/common';
import { AnalyticsCacheService } from './analytics-cache.service';
import { LockService } from './lock.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, LockService, AnalyticsCacheService],
  exports: [RedisService, LockService, AnalyticsCacheService],
})
export class RedisModule {}
