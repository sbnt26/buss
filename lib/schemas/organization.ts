import { z } from 'zod';

export const OrganizationUpdateSchema = z.object({
  addressStreet: z
    .string({ required_error: 'Ulice je povinná' })
    .min(1, 'Ulice je povinná'),
  addressCity: z
    .string({ required_error: 'Město je povinné' })
    .min(1, 'Město je povinné'),
  addressZip: z
    .string({ required_error: 'PSČ je povinné' })
    .regex(/^\d{5}$/, 'PSČ musí obsahovat 5 číslic'),
  addressCountry: z
    .string()
    .trim()
    .min(2)
    .max(2)
    .default('CZ'),
  bankAccount: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) =>
        !val ||
        /^[0-9]{1,6}-?[0-9]{0,10}\/[0-9]{4}$/.test(val) ||
        /^[0-9]{1,16}(?:\s?[0-9]{4})*$/.test(val),
      'Neplatný formát čísla účtu'
    ),
  iban: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(val),
      'Neplatný formát IBAN'
    ),
  bankName: z.string().trim().optional(),
  dic: z.string().trim().optional(),
  isVatPayer: z.boolean().default(true),
  defaultVatRate: z.number().min(0).max(100).default(21),
  invoicePrefix: z.string().trim().max(10).default(''),
  invoiceNumberingStart: z.number().int().min(1).default(1),
  defaultCurrency: z.string().trim().length(3).default('CZK'),
});

export type OrganizationUpdateInput = z.infer<typeof OrganizationUpdateSchema>;
