import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoUsage, PromoUsageSchema } from './promo-usage.schema';
import { PromoUsagesRepository } from './promo-usages.repository';
import { PromoCode, PromoCodeSchema } from './promocode.schema';
import { PromocodesRepository } from './promocodes.repository';

/** Shared by the promocodes module, the orders module and the seeder. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: PromoUsage.name, schema: PromoUsageSchema },
    ]),
  ],
  providers: [PromocodesRepository, PromoUsagesRepository],
  exports: [PromocodesRepository, PromoUsagesRepository, MongooseModule],
})
export class PromocodesRepositoryModule {}
