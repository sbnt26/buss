import { z } from 'zod';

export const InvoiceItemSchema = z.object({
  description: z.string().min(1, 'Popis je povinný').max(500),
  quantity: z.number().positive('Množství musí být kladné').max(999999),
  unitPrice: z.number().positive('Cena musí být kladná').max(9999999),
  vatRate: z.number().min(0).max(100),
  unit: z.string().max(20).default('ks'),
});

export const CreateInvoiceSchema = z.object({
  clientId: z.number().int().positive(),
  items: z.array(InvoiceItemSchema).min(1, 'Alespoň jedna položka je povinná').max(100),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Neplatný formát data'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Neplatný formát data'),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => new Date(data.dueDate) >= new Date(data.issueDate),
  { message: 'Datum splatnosti musí být po datu vystavení', path: ['dueDate'] }
);

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;



