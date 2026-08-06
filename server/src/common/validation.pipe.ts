import { ValidationError, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { FieldError, ValidationException } from './errors';

function flatten(errors: ValidationError[], parentPath = ''): FieldError[] {
  const result: FieldError[] = [];
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const constraints = error.constraints ? Object.values(error.constraints) : [];
    if (constraints.length > 0) {
      result.push({ field: path, messages: constraints });
    }
    if (error.children && error.children.length > 0) {
      result.push(...flatten(error.children, path));
    }
  }
  return result;
}

/**
 * `forbidNonWhitelisted` turns any unknown body property into a 400 that names
 * the offending field — required by the API contract.
 */
export function createValidationPipe(): ValidationPipe {
  const options: ValidationPipeOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validateCustomDecorators: true,
    exceptionFactory: (errors: ValidationError[]) => new ValidationException(flatten(errors)),
  };
  return new ValidationPipe(options);
}
