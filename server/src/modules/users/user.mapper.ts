import { toIsoRequired } from '../../common/datetime';
import { UserSnapshot } from '../../infrastructure/outbox/outbox.types';
import { UserDocument } from './user.schema';

/** Public shape of a user. `passwordHash` is intentionally absent. */
export interface UserResponse {
  mongoId: string;
  phone: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toUserResponse(document: UserDocument): UserResponse {
  return {
    mongoId: document.id as string,
    phone: document.phone,
    name: document.name,
    isActive: document.isActive,
    createdAt: toIsoRequired(document.createdAt),
    updatedAt: toIsoRequired(document.updatedAt),
  };
}

export function toUserSnapshot(document: UserDocument): UserSnapshot {
  return {
    mongoId: document.id as string,
    phone: document.phone,
    name: document.name,
    isActive: document.isActive,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
