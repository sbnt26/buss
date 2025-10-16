import { PoolClient } from 'pg';
import { getClient } from './db';

/**
 * Get next invoice number for organization (race-safe)
 * Uses UPSERT with ON CONFLICT to ensure atomic increment
 */
export async function getNextInvoiceNumber(
  organizationId: number,
  year: number,
  client?: PoolClient
): Promise<number> {
  const shouldRelease = !client;
  const dbClient = client || (await getClient());

  try {
    const result = await dbClient.query<{ last_seq: number }>(
      `INSERT INTO counters (organization_id, year, last_seq)
       VALUES ($1, $2, 1)
       ON CONFLICT (organization_id, year)
       DO UPDATE SET 
         last_seq = counters.last_seq + 1,
         updated_at = NOW()
       RETURNING last_seq`,
      [organizationId, year]
    );

    return result.rows[0].last_seq;
  } finally {
    if (shouldRelease) {
      dbClient.release();
    }
  }
}

/**
 * Format invoice number with prefix
 * Examples:
 * - prefix='', year=2025, seq=1 => '2025-00001'
 * - prefix='FV-', year=2025, seq=123 => 'FV-2025-00123'
 */
export function formatInvoiceNumber(prefix: string, year: number, seq: number): string {
  const paddedSeq = seq.toString().padStart(5, '0');
  return `${prefix}${year}-${paddedSeq}`;
}

/**
 * Generate variable symbol from invoice number
 * Removes prefix and dashes, pads to 10 digits
 * Examples:
 * - '2025-00001' => '0202500001'
 * - 'FV-2025-00123' => '2025000123'
 */
export function generateVariableSymbol(invoiceNumber: string): string {
  // Remove any non-digit characters except the year-sequence part
  const match = invoiceNumber.match(/(\d{4})-(\d{5})/);
  
  if (!match) {
    throw new Error(`Invalid invoice number format: ${invoiceNumber}`);
  }

  const [, year, seq] = match;
  const vs = year + seq; // e.g., "202500001"
  
  // Pad to 10 digits if needed
  return vs.padStart(10, '0');
}

/**
 * Parse invoice number to extract year and sequence
 */
export function parseInvoiceNumber(invoiceNumber: string): { year: number; seq: number } {
  const match = invoiceNumber.match(/(\d{4})-(\d{5})/);
  
  if (!match) {
    throw new Error(`Invalid invoice number format: ${invoiceNumber}`);
  }

  const [, yearStr, seqStr] = match;
  return {
    year: parseInt(yearStr, 10),
    seq: parseInt(seqStr, 10),
  };
}



