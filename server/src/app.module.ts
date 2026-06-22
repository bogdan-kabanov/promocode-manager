import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { ClickhouseModule } from './infrastructure/clickhouse/clickhouse.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { PromoCodesModule } from './modules/promocodes/promocodes.module';
import { HealthController } from './presentation/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongoUri'),
      }),
    }),
    ClickhouseModule,
    RedisModule,
    PromoCodesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
