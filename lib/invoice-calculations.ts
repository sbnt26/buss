/**
 * Invoice calculation utilities
 * Handles VAT calculations and totals with proper rounding
 */

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  unit?: string;
}

export interface CalculatedItem extends InvoiceItem {
  subtotal: number;
  vatAmount: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
  items: CalculatedItem[];
}

/**
 * Round to 2 decimal places (for currency)
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate totals for a single invoice item
 */
export function calculateItemTotals(item: InvoiceItem): CalculatedItem {
  const subtotal = roundCurrency(item.quantity * item.unitPrice);
  const vatAmount = roundCurrency(subtotal * (item.vatRate / 100));
  const total = roundCurrency(subtotal + vatAmount);

  return {
    ...item,
    subtotal,
    vatAmount,
    total,
  };
}

/**
 * Calculate totals for entire invoice
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  isVatPayer: boolean = true
): InvoiceTotals {
  // Calculate each item
  const calculatedItems = items.map((item) => {
    // Force VAT rate to 0 if not VAT payer
    const effectiveVatRate = isVatPayer ? item.vatRate : 0;
    return calculateItemTotals({ ...item, vatRate: effectiveVatRate });
  });

  // Sum all items
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const vatAmount = calculatedItems.reduce((sum, item) => sum + item.vatAmount, 0);
  const total = calculatedItems.reduce((sum, item) => sum + item.total, 0);

  return {
    subtotal: roundCurrency(subtotal),
    vatAmount: roundCurrency(vatAmount),
    total: roundCurrency(total),
    items: calculatedItems,
  };
}

/**
 * Validate invoice item values
 */
export function validateInvoiceItem(item: InvoiceItem): string[] {
  const errors: string[] = [];

  if (item.quantity <= 0) {
    errors.push('Množství musí být kladné číslo');
  }

  if (item.quantity > 999999) {
    errors.push('Množství je příliš velké');
  }

  if (item.unitPrice <= 0) {
    errors.push('Jednotková cena musí být kladné číslo');
  }

  if (item.unitPrice > 9999999) {
    errors.push('Jednotková cena je příliš velká');
  }

  if (item.vatRate < 0 || item.vatRate > 100) {
    errors.push('Sazba DPH musí být mezi 0 a 100%');
  }

  if (!item.description || item.description.trim().length === 0) {
    errors.push('Popis položky je povinný');
  }

  if (item.description.length > 500) {
    errors.push('Popis položky je příliš dlouhý (max 500 znaků)');
  }

  return errors;
}

/**
 * Format currency for display (Czech locale)
 */
export function formatCurrency(amount: number, currency: string = 'CZK'): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format number for display (Czech locale)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}



