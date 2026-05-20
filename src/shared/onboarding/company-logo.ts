import { z } from 'zod';

import { ensureJsonObject } from '@/shared/common/json';

export const companyLogoDataUrlMaxLength = 2_500_000;

export type CompanyLogoStepValues = {
  dataUrl: string | null;
};

export function isCompanyLogoDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= companyLogoDataUrlMaxLength &&
    /^data:image\/png;base64,[a-z0-9+/]+={0,2}$/i.test(value.trim())
  );
}

const companyLogoDataUrlSchema = z
  .union([z.string().trim().max(companyLogoDataUrlMaxLength), z.null()])
  .optional()
  .transform((value) =>
    typeof value === 'string' && value.trim().length ? value.trim() : null,
  )
  .refine((value) => value === null || isCompanyLogoDataUrl(value), {
    message: 'invalid-company-logo',
  });

export const companyLogoStepValuesSchema = z
  .object({
    dataUrl: companyLogoDataUrlSchema,
  })
  .transform(
    (value): CompanyLogoStepValues => ({
      dataUrl: value.dataUrl ?? null,
    }),
  );

export const companyLogoStepSchema = companyLogoStepValuesSchema.transform(
  (value) => ensureJsonObject(value),
);

export function parseCompanyLogoStepValues(
  value: unknown,
): CompanyLogoStepValues {
  return companyLogoStepValuesSchema.parse(value);
}
