import { Module } from '@nestjs/common';
import { ClickhouseModule } from '../../infrastructure/clickhouse/clickhouse.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [ClickhouseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
