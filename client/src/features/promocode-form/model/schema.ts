import { z } from 'zod';
import { PROMOCODE_PATTERN } from '@/shared/config';
import { t } from '@/shared/i18n';

const optionalLimit = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1),
    t('validation.limit.min'),
  );

const optionalMoment = z
  .string()
  .refine(
    (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
    t('validation.date.invalid'),
  );

export const promoCodeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .refine(
        (value) => PROMOCODE_PATTERN.test(value.toUpperCase()),
        t('validation.code.pattern'),
      ),
    discountPercent: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .refine((value) => {
        if (!/^\d+$/.test(value)) return false;
        const parsed = Number(value);
        return parsed >= 1 && parsed <= 100;
      }, t('validation.discountPercent.range')),
    maxUsagesTotal: optionalLimit,
    maxUsagesPerUser: optionalLimit,
    validFrom: optionalMoment,
    validUntil: optionalMoment,
  })
  .superRefine((values, context) => {
    if (!values.validFrom || !values.validUntil) return;
    const from = new Date(values.validFrom).getTime();
    const until = new Date(values.validUntil).getTime();
    if (Number.isNaN(from) || Number.isNaN(until)) return;
    if (until <= from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validUntil'],
        message: t('validation.date.order'),
      });
    }
  });

export type PromoCodeFormValues = z.infer<typeof promoCodeFormSchema>;

export const EMPTY_PROMOCODE_FORM: PromoCodeFormValues = {
  code: '',
  discountPercent: '',
  maxUsagesTotal: '',
  maxUsagesPerUser: '',
  validFrom: '',
  validUntil: '',
};
