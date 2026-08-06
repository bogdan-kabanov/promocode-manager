import { HttpException, HttpStatus } from '@nestjs/common';

/** Machine-readable codes for every named case of the assignment. */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_DISABLED: 'USER_DISABLED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  PHONE_INVALID: 'PHONE_INVALID',
  PHONE_TAKEN: 'PHONE_TAKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CANNOT_DEACTIVATE_SELF: 'CANNOT_DEACTIVATE_SELF',
  PROMOCODE_NOT_FOUND: 'PROMOCODE_NOT_FOUND',
  CODE_DUPLICATE: 'CODE_DUPLICATE',
  CODE_INVALID: 'CODE_INVALID',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_FORBIDDEN: 'ORDER_FORBIDDEN',
  ORDER_ALREADY_HAS_PROMOCODE: 'ORDER_ALREADY_HAS_PROMOCODE',
  PROMOCODE_DISABLED: 'PROMOCODE_DISABLED',
  PROMOCODE_NOT_STARTED: 'PROMOCODE_NOT_STARTED',
  PROMOCODE_EXPIRED: 'PROMOCODE_EXPIRED',
  PROMOCODE_LIMIT_REACHED: 'PROMOCODE_LIMIT_REACHED',
  USER_LIMIT_REACHED: 'USER_LIMIT_REACHED',
  PROMOCODE_LOCK_TIMEOUT: 'PROMOCODE_LOCK_TIMEOUT',
  DATE_RANGE_INVALID: 'DATE_RANGE_INVALID',
  INVALID_MONGO_ID: 'INVALID_MONGO_ID',
  ANALYTICS_UNAVAILABLE: 'ANALYTICS_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Human readable Russian messages shown directly in the UI. */
export const ERROR_MESSAGES: Record<ErrorCodeValue, string> = {
  VALIDATION_ERROR: 'Проверьте правильность заполнения полей',
  UNAUTHORIZED: 'Требуется авторизация',
  INVALID_CREDENTIALS: 'Неверный телефон или пароль',
  USER_DISABLED: 'Пользователь деактивирован',
  REFRESH_TOKEN_INVALID: 'Refresh-токен недействителен или уже использован',
  PHONE_INVALID: 'Некорректный номер телефона. Ожидается мобильный номер РФ',
  PHONE_TAKEN: 'Пользователь с таким телефоном уже существует',
  USER_NOT_FOUND: 'Пользователь не найден',
  CANNOT_DEACTIVATE_SELF: 'Нельзя деактивировать самого себя',
  PROMOCODE_NOT_FOUND: 'Промокод не найден',
  CODE_DUPLICATE: 'Промокод с таким кодом уже существует',
  CODE_INVALID: 'Код промокода должен содержать от 3 до 32 символов A-Z, 0-9, _ или -',
  ORDER_NOT_FOUND: 'Заказ не найден',
  ORDER_FORBIDDEN: 'Заказ принадлежит другому пользователю',
  ORDER_ALREADY_HAS_PROMOCODE: 'К заказу уже применён промокод',
  PROMOCODE_DISABLED: 'Промокод отключён',
  PROMOCODE_NOT_STARTED: 'Срок действия промокода ещё не начался',
  PROMOCODE_EXPIRED: 'Срок действия промокода истёк',
  PROMOCODE_LIMIT_REACHED: 'Исчерпан общий лимит использований промокода',
  USER_LIMIT_REACHED: 'Исчерпан лимит использований промокода для этого пользователя',
  PROMOCODE_LOCK_TIMEOUT: 'Промокод сейчас применяется другим запросом, попробуйте ещё раз',
  DATE_RANGE_INVALID: 'Начало периода не может быть позже его окончания',
  INVALID_MONGO_ID: 'Некорректный идентификатор',
  ANALYTICS_UNAVAILABLE: 'Аналитическое хранилище недоступно, повторите попытку позже',
  INTERNAL_ERROR: 'Внутренняя ошибка сервера',
};

export interface BusinessErrorBody {
  statusCode: number;
  message: string;
  details: { code: ErrorCodeValue };
}

/**
 * Business conflict / domain error.
 * Serialized as `{ statusCode, message, details: { code } }`.
 */
export class BusinessException extends HttpException {
  readonly code: ErrorCodeValue;

  constructor(code: ErrorCodeValue, status: HttpStatus, messageOverride?: string) {
    const body: BusinessErrorBody = {
      statusCode: status,
      message: messageOverride ?? ERROR_MESSAGES[code],
      details: { code },
    };
    super(body, status);
    this.code = code;
  }

  static notFound(code: ErrorCodeValue): BusinessException {
    return new BusinessException(code, HttpStatus.NOT_FOUND);
  }

  static conflict(code: ErrorCodeValue): BusinessException {
    return new BusinessException(code, HttpStatus.CONFLICT);
  }

  static forbidden(code: ErrorCodeValue): BusinessException {
    return new BusinessException(code, HttpStatus.FORBIDDEN);
  }

  static unauthorized(code: ErrorCodeValue): BusinessException {
    return new BusinessException(code, HttpStatus.UNAUTHORIZED);
  }

  static badRequest(code: ErrorCodeValue): BusinessException {
    return new BusinessException(code, HttpStatus.BAD_REQUEST);
  }

  static unavailable(code: ErrorCodeValue): BusinessException {
    return new BusinessException(code, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export interface FieldError {
  field: string;
  messages: string[];
}

export interface ValidationErrorBody extends BusinessErrorBody {
  field_errors: FieldError[];
}

/** 400 with per-field details. */
export class ValidationException extends HttpException {
  constructor(fieldErrors: FieldError[]) {
    const body: ValidationErrorBody = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      details: { code: ErrorCode.VALIDATION_ERROR },
      field_errors: fieldErrors,
    };
    super(body, HttpStatus.BAD_REQUEST);
  }
}
