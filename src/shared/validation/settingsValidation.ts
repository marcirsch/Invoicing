import { z } from 'zod';
const logoDataUrlSchema = z
  .string()
  .max(2_000_022)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  .nullable()
  .optional()
  .default(null);
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
    website: z.string().default(''),
    iban: z.string().default(''),
    bankName: z.string().default(''),
    logoDataUrl: logoDataUrlSchema,
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
  invoiceFooter: z.string().max(2000).default(''),
});
export const settingsSchema = settingsBaseSchema.superRefine(
  (settings, context) => {
    if (settings.paymentTermDays > 3650)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment term must be 3650 days or fewer.',
        path: ['paymentTermDays'],
      });
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
