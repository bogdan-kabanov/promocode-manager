import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoCode, PromoCodeSchema } from './domain/promocode.schema';

import { PromoCodesController } from './presentation/promocodes.controller';
import { AnalyticsController } from './presentation/analytics.controller';

import { PromoCodeMongoRepository } from './infrastructure/promocode.mongo.repository';
import { PromoCodeReadRepositoryImpl } from './infrastructure/promocode.read.repository';
import { PromoCodeSyncService } from './infrastructure/promocode.sync.service';

import { PROMOCODE_WRITE_REPOSITORY } from './application/ports/promocode.write-repository';
import { PROMOCODE_READ_REPOSITORY } from './application/ports/promocode.read-repository';
import { PROMOCODE_SYNC_PORT } from './application/ports/promocode.sync.port';

import { CreatePromoCodeHandler } from './application/commands/create-promocode.handler';
import { UpdatePromoCodeHandler } from './application/commands/update-promocode.handler';
import { DeletePromoCodeHandler } from './application/commands/delete-promocode.handler';
import { RedeemPromoCodeHandler } from './application/commands/redeem-promocode.handler';
import { ListPromoCodesHandler } from './application/queries/list-promocodes.handler';
import { ListRedemptionsHandler } from './application/queries/list-redemptions.handler';
import { GetAnalyticsHandler } from './application/queries/get-analytics.handler';

const CommandHandlers = [
  CreatePromoCodeHandler,
  UpdatePromoCodeHandler,
  DeletePromoCodeHandler,
  RedeemPromoCodeHandler,
];

const QueryHandlers = [
  ListPromoCodesHandler,
  ListRedemptionsHandler,
  GetAnalyticsHandler,
];

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([
      { name: PromoCode.name, schema: PromoCodeSchema },
    ]),
  ],
  controllers: [PromoCodesController, AnalyticsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    { provide: PROMOCODE_WRITE_REPOSITORY, useClass: PromoCodeMongoRepository },
    { provide: PROMOCODE_READ_REPOSITORY, useClass: PromoCodeReadRepositoryImpl },
    { provide: PROMOCODE_SYNC_PORT, useClass: PromoCodeSyncService },
  ],
})
export class PromoCodesModule {}
