import {
  calculateItemTotals,
  calculateInvoiceTotals,
  roundCurrency,
  validateInvoiceItem,
  formatCurrency,
  formatNumber,
} from '@/lib/invoice-calculations';

describe('Invoice Calculations', () => {
  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(10.123)).toBe(10.12);
      expect(roundCurrency(10.125)).toBe(10.13); // Banker's rounding
      expect(roundCurrency(10.999)).toBe(11.00);
    });
  });

  describe('calculateItemTotals', () => {
    it('should calculate correctly with 21% VAT', () => {
      const item = {
        description: 'Service',
        quantity: 10,
        unitPrice: 250,
        vatRate: 21,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(2500);
      expect(result.vatAmount).toBe(525);
      expect(result.total).toBe(3025);
    });

    it('should calculate correctly with 0% VAT', () => {
      const item = {
        description: 'Service',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 0,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(1000);
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('should handle decimal quantities', () => {
      const item = {
        description: 'Material',
        quantity: 2.5,
        unitPrice: 100,
        vatRate: 21,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(250);
      expect(result.vatAmount).toBe(52.5);
      expect(result.total).toBe(302.5);
    });

    it('should round currency values', () => {
      const item = {
        description: 'Service',
        quantity: 3,
        unitPrice: 333.33,
        vatRate: 21,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(999.99);
      expect(result.vatAmount).toBe(210.00);
      expect(result.total).toBe(1209.99);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should calculate totals for multiple items with VAT', () => {
      const items = [
        { description: 'Item 1', quantity: 2, unitPrice: 1000, vatRate: 21 },
        { description: 'Item 2', quantity: 1, unitPrice: 500, vatRate: 21 },
      ];

      const result = calculateInvoiceTotals(items, true);

      expect(result.subtotal).toBe(2500);
      expect(result.vatAmount).toBe(525);
      expect(result.total).toBe(3025);
      expect(result.items).toHaveLength(2);
    });

    it('should force 0% VAT when not VAT payer', () => {
      const items = [
        { description: 'Item 1', quantity: 1, unitPrice: 1000, vatRate: 21 },
      ];

      const result = calculateInvoiceTotals(items, false);

      expect(result.subtotal).toBe(1000);
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(1000);
      expect(result.items[0].vatRate).toBe(0);
    });

    it('should handle mixed VAT rates', () => {
      const items = [
        { description: 'Item 1', quantity: 1, unitPrice: 1000, vatRate: 21 },
        { description: 'Item 2', quantity: 1, unitPrice: 1000, vatRate: 15 },
        { description: 'Item 3', quantity: 1, unitPrice: 1000, vatRate: 0 },
      ];

      const result = calculateInvoiceTotals(items, true);

      expect(result.subtotal).toBe(3000);
      expect(result.vatAmount).toBe(360); // 210 + 150 + 0
      expect(result.total).toBe(3360);
    });

    it('should handle empty items array', () => {
      const result = calculateInvoiceTotals([], true);

      expect(result.subtotal).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('validateInvoiceItem', () => {
    it('should pass validation for valid item', () => {
      const item = {
        description: 'Valid item',
        quantity: 1,
        unitPrice: 100,
        vatRate: 21,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toHaveLength(0);
    });

    it('should fail for negative quantity', () => {
      const item = {
        description: 'Item',
        quantity: -1,
        unitPrice: 100,
        vatRate: 21,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toContain('Množství musí být kladné číslo');
    });

    it('should fail for zero quantity', () => {
      const item = {
        description: 'Item',
        quantity: 0,
        unitPrice: 100,
        vatRate: 21,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toContain('Množství musí být kladné číslo');
    });

    it('should fail for negative price', () => {
      const item = {
        description: 'Item',
        quantity: 1,
        unitPrice: -100,
        vatRate: 21,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toContain('Jednotková cena musí být kladné číslo');
    });

    it('should fail for invalid VAT rate', () => {
      const item = {
        description: 'Item',
        quantity: 1,
        unitPrice: 100,
        vatRate: 150,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toContain('Sazba DPH musí být mezi 0 a 100%');
    });

    it('should fail for empty description', () => {
      const item = {
        description: '',
        quantity: 1,
        unitPrice: 100,
        vatRate: 21,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toContain('Popis položky je povinný');
    });

    it('should fail for too long description', () => {
      const item = {
        description: 'a'.repeat(501),
        quantity: 1,
        unitPrice: 100,
        vatRate: 21,
      };

      const errors = validateInvoiceItem(item);
      expect(errors).toContain('Popis položky je příliš dlouhý (max 500 znaků)');
    });
  });

  describe('formatCurrency', () => {
    it('should format CZK currency', () => {
      const formatted = formatCurrency(1234.56, 'CZK');
      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
      expect(formatted).toContain('56');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Czech locale', () => {
      const formatted = formatNumber(1234.56);
      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
      expect(formatted).toContain('56');
    });

    it('should respect decimal places', () => {
      expect(formatNumber(10, 0)).toBe('10');
      expect(formatNumber(10.5, 2)).toContain('10');
      expect(formatNumber(10.5, 2)).toContain('5');
    });
  });
});



