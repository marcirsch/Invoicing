import { z } from 'zod';
export const settingsBaseSchema = z.object({
  company: z.object({
    name: z.string(),
    address: z.object({
      street: z.string(),
      buildingNumber: z.string(),
      postalCode: z.string(),
      city: z.string(),
      country: z.string(),
    }),
    phone: z.string(),
    email: z.string().email().or(z.literal('')),
  }),
  csvPath: z.string().nullable(),
  archivePath: z.string().nullable(),
  currency: z.enum(['CHF', 'EUR']),
  paymentTermDays: z.number().int().nonnegative(),
  invoicePrefix: z.string(),
  invoiceYear: z.string(),
  nextSequence: z.number().int().nonnegative(),
  template: z.string(),
  appearance: z.enum(['system', 'light', 'dark']),
});
export const settingsSchema = settingsBaseSchema.superRefine(
  (settings, context) => {
    const values: [string, string][] = [
      ['company.name', settings.company.name],
      ['company.address.street', settings.company.address.street],
      [
        'company.address.buildingNumber',
        settings.company.address.buildingNumber,
      ],
      ['company.address.postalCode', settings.company.address.postalCode],
      ['company.address.city', settings.company.address.city],
      ['company.address.country', settings.company.address.country],
    ];
    for (const [path, value] of values)
      if (!value)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            path === 'company.name'
              ? 'Enter your company name.'
              : 'Complete this field.',
          path: path.split('.'),
        });
  },
);
export type SettingsInput = z.infer<typeof settingsSchema>;
