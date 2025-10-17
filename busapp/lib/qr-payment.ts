import QRCode from 'qrcode';

/**
 * QR Payment data for Czech SPD 1.0 format
 */
export interface QRPaymentData {
  iban: string;
  amount: number;
  currency: string;
  variableSymbol: string;
  message?: string;
  recipientName?: string;
}

/**
 * Generate QR payment string in SPD 1.0 format (Czech standard)
 * Format: SPD*1.0*ACC:IBAN*AM:amount*CC:currency*X-VS:VS*MSG:message*RN:name
 */
export function generateQRPayload(data: QRPaymentData): string {
  const parts: string[] = ['SPD*1.0'];

  // IBAN (required)
  parts.push(`ACC:${data.iban}`);

  // Amount (required)
  parts.push(`AM:${data.amount.toFixed(2)}`);

  // Currency (required)
  parts.push(`CC:${data.currency}`);

  // Variable Symbol (optional but important for CZ payments)
  if (data.variableSymbol) {
    parts.push(`X-VS:${data.variableSymbol}`);
  }

  // Message (optional)
  if (data.message) {
    parts.push(`MSG:${data.message}`);
  }

  // Recipient Name (optional)
  if (data.recipientName) {
    parts.push(`RN:${data.recipientName}`);
  }

  return parts.join('*');
}

/**
 * Generate QR code as data URI
 * Returns base64 data URI that can be embedded in HTML
 */
export async function generateQRCode(data: QRPaymentData): Promise<string> {
  const payload = generateQRPayload(data);
  
  try {
    // Generate QR code as data URI
    const dataUri = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return dataUri;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Validate IBAN format (basic check)
 */
export function validateIBAN(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Czech IBAN should be 24 characters starting with CZ
  if (cleaned.startsWith('CZ')) {
    return cleaned.length === 24 && /^CZ\d{22}$/.test(cleaned);
  }
  
  // Basic IBAN format: 2 letters + 2 digits + up to 30 alphanumeric
  return /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned);
}



