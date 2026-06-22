import { z } from 'zod';

export const promocodeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'At least 3 characters')
      .max(32, 'At most 32 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, digits, - and _'),
    description: z.string().trim().max(200, 'At most 200 characters').optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.coerce.number().min(0, 'Must be ≥ 0'),
    maxUsages: z.coerce
      .number()
      .int('Must be an integer')
      .min(0, 'Must be ≥ 0 (0 = unlimited)'),
    status: z.enum(['ACTIVE', 'PAUSED', 'EXPIRED']),
    startsAt: z.string().min(1, 'Required'),
    expiresAt: z.string().optional(),
  })
  .refine(
    (data) =>
      data.discountType !== 'PERCENTAGE' || data.discountValue <= 100,
    { path: ['discountValue'], message: 'Percentage cannot exceed 100' },
  )
  .refine(
    (data) =>
      !data.expiresAt ||
      new Date(data.expiresAt).getTime() > new Date(data.startsAt).getTime(),
    { path: ['expiresAt'], message: 'Expiry must be after start date' },
  );

export type PromoCodeFormValues = z.infer<typeof promocodeFormSchema>;
