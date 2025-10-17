import { z } from 'zod';

/**
 * Client schema for validation
 */
export const clientSchema = z.object({
  name: z.string().min(1, 'Název klienta je povinný'),
  email: z.string().email('Neplatný email').optional().or(z.literal('')),
  phone: z.string().optional(),
  ic: z.string().optional(), // IČO
  dic: z.string().optional(), // DIČ
  street: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('CZ'),
  note: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

/**
 * Client update schema (all fields optional except ID)
 */
export const clientUpdateSchema = clientSchema.partial();

/**
 * API schema for updating client persisted attributes
 * Matches database column naming (snake_case)
 */
export const clientApiUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')).or(z.null()),
    phone: z.string().optional().or(z.literal('')).or(z.null()),
    ico: z.string().optional().or(z.literal('')).or(z.null()),
    dic: z.string().optional().or(z.literal('')).or(z.null()),
    address_street: z.string().optional().or(z.literal('')).or(z.null()),
    address_city: z.string().optional().or(z.literal('')).or(z.null()),
    address_zip: z.string().optional().or(z.literal('')).or(z.null()),
    address_country: z.string().optional().or(z.literal('')).or(z.null()),
    notes: z.string().optional().or(z.literal('')).or(z.null()),
  });

export type ClientApiUpdateInput = z.infer<typeof clientApiUpdateSchema>;
