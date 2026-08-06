import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ERROR_MESSAGES, ErrorCode } from './errors';

interface NormalizedBody {
  statusCode: number;
  message: string;
  details: { code: string };
  field_errors?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Maps framework-level HTTP statuses onto our machine codes. */
function codeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.ANALYTICS_UNAVAILABLE;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.normalize(exception);
    response.status(body.statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (isRecord(payload) && isRecord(payload['details'])) {
        return payload as unknown as NormalizedBody;
      }

      const message = isRecord(payload)
        ? String(payload['message'] ?? exception.message)
        : String(payload);

      return {
        statusCode: status,
        message,
        details: { code: codeForStatus(status) },
      };
    }

    this.logger.error(
      `Unhandled exception: ${exception instanceof Error ? exception.stack : String(exception)}`,
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      details: { code: ErrorCode.INTERNAL_ERROR },
    };
  }
}
