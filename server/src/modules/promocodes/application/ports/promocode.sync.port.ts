import { PromoCodeEntity } from './promocode.write-repository';

export interface RedemptionRecord {
  id: string;
  promocodeId: string;
  code: string;
  amount: number;
  redeemedAt: Date;
}

export interface PromoCodeSyncPort {
  upsert(entity: PromoCodeEntity): Promise<void>;
  markDeleted(entity: PromoCodeEntity): Promise<void>;
  recordRedemption(record: RedemptionRecord): Promise<void>;
}

export const PROMOCODE_SYNC_PORT = Symbol('PROMOCODE_SYNC_PORT');
