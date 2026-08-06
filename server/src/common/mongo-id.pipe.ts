import { Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';
import { BusinessException, ErrorCode } from './errors';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
      throw BusinessException.badRequest(ErrorCode.INVALID_MONGO_ID);
    }
    return value;
  }
}
