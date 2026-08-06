import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidPhone } from './phone';
import { isValidApiMoney } from './money';
import { PROMOCODE_CODE_PATTERN } from '../modules/promocodes/promocode.schema';

@ValidatorConstraint({ name: 'isRuMobilePhone', async: false })
class IsRuMobilePhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidPhone(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} должен быть мобильным номером РФ`;
  }
}

export function IsRuMobilePhone(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsRuMobilePhoneConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isApiMoney', async: false })
class IsApiMoneyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidApiMoney(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} должен быть неотрицательным числом с не более чем двумя знаками после запятой`;
  }
}

export function IsApiMoney(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsApiMoneyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isPromocodeCode', async: false })
class IsPromocodeCodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && PROMOCODE_CODE_PATTERN.test(value.trim().toUpperCase());
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} должен соответствовать шаблону ^[A-Z0-9_-]{3,32}$`;
  }
}

export function IsPromocodeCode(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsPromocodeCodeConstraint,
    });
  };
}
