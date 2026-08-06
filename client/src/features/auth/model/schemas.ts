import { z } from 'zod';
import { t } from '@/shared/i18n';
import { isRussianMobile } from '@/shared/lib/phone';

/**
 * Правила полей повторяют серверные. Телефон разбирается той же библиотекой,
 * что и на сервере, — собственная маска разошлась бы с серверным правилом.
 */
export const phoneField = z
  .string()
  .min(1, t('validation.required'))
  .refine(isRussianMobile, t('validation.phone.invalid'));

export const nameField = z
  .string()
  .trim()
  .min(1, t('validation.required'))
  .max(200, t('validation.name.tooLong'));

export const loginSchema = z.object({
  phone: phoneField,
  password: z.string().min(1, t('validation.required')),
});

export const registerSchema = z.object({
  name: nameField,
  phone: phoneField,
  password: z
    .string()
    .min(8, t('validation.password.length'))
    .max(128, t('validation.password.length')),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
