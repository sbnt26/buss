import { z } from 'zod';

/**
 * Signup schema
 */
export const SignupSchema = z.object({
  email: z.string().email('Neplatný formát emailu'),
  password: z
    .string()
    .min(8, 'Heslo musí mít alespoň 8 znaků')
    .regex(/[A-Z]/, 'Heslo musí obsahovat alespoň jedno velké písmeno')
    .regex(/[a-z]/, 'Heslo musí obsahovat alespoň jedno malé písmeno')
    .regex(/[0-9]/, 'Heslo musí obsahovat alespoň jednu číslici'),
  fullName: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  companyName: z.string().min(2, 'Název firmy musí mít alespoň 2 znaky'),
  ico: z
    .string()
    .regex(/^\d{8}$/, 'IČO musí obsahovat 8 číslic'),
});

export type SignupInput = z.infer<typeof SignupSchema>;

/**
 * Login schema
 */
export const LoginSchema = z.object({
  email: z.string().email('Neplatný formát emailu'),
  password: z.string().min(1, 'Heslo je povinné'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Onboarding schema (extended company details)
 */
export const OnboardingSchema = z.object({
  name: z.string().min(1, 'Název je povinný'),
  ico: z
    .string()
    .min(1, 'IČO je povinné')
    .regex(/^\d{8}$/, 'IČO musí obsahovat 8 číslic'),
  // Company details
  addressStreet: z.string().min(1, 'Ulice je povinná'),
  addressCity: z.string().min(1, 'Město je povinné'),
  addressZip: z.string().regex(/^\d{5}$/, 'PSČ musí obsahovat 5 číslic'),
  addressCountry: z.string().default('CZ'),
  
  // Banking
  bankAccount: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.length === 0 ||
        /^[0-9]{1,6}-?[0-9]{0,10}\/[0-9]{4}$/.test(val) ||
        /^[0-9]{1,16}(?:\s?[0-9]{4})*$/.test(val),
      'Neplatný formát čísla účtu'
    ),
  iban: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(val),
      'Neplatný formát IBAN'
    ),
  bankName: z.string().optional(),
  
  // Tax
  dic: z.string().optional(),
  isVatPayer: z.boolean().default(true),
  defaultVatRate: z.number().min(0).max(100).default(21),
  
  // Invoice settings
  invoicePrefix: z.string().max(10).default(''),
  invoiceNumberingStart: z.number().int().min(1).default(1),
  defaultCurrency: z.string().length(3).default('CZK'),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
