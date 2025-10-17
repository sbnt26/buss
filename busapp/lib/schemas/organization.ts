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
    .default('CZ')
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => /^[A-Z]{2}$/.test(val), 'Kód země musí mít 2 znaky'),
  bankAccount: z
    .string()
    .optional()
    .transform((val) => (val ?? '').trim())
    .refine(
      (val) =>
        !val ||
        /^[0-9]{1,6}-?[0-9]{0,10}\/[0-9]{4}$/.test(val) ||
        /^[0-9]{1,16}(?:\s?[0-9]{4})*$/.test(val),
      'Neplatný formát čísla účtu'
    ),
  iban: z
    .string()
    .optional()
    .transform((val) => (val ?? '').trim().toUpperCase())
    .refine(
      (val) => !val || /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(val),
      'Neplatný formát IBAN'
    ),
  bankName: z.string().optional().transform((val) => (val ?? '').trim()),
  dic: z.string().optional().transform((val) => (val ?? '').trim().toUpperCase()),
  isVatPayer: z.boolean().default(true),
  defaultVatRate: z.number().min(0).max(100).default(21),
  invoicePrefix: z
    .string()
    .default('')
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => val.length <= 10, 'Prefix může mít maximálně 10 znaků'),
  invoiceNumberingStart: z.number().int().min(1).default(1),
  defaultCurrency: z
    .string()
    .default('CZK')
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => /^[A-Z]{3}$/.test(val), 'Kód měny musí mít 3 znaky'),
});

export type OrganizationUpdateInput = z.infer<typeof OrganizationUpdateSchema>;
