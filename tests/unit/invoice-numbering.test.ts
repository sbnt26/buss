import {
  formatInvoiceNumber,
  generateVariableSymbol,
  parseInvoiceNumber,
} from '@/lib/invoice-numbering';

describe('Invoice Numbering', () => {
  describe('formatInvoiceNumber', () => {
    it('should format number without prefix', () => {
      expect(formatInvoiceNumber('', 2025, 1)).toBe('2025-00001');
      expect(formatInvoiceNumber('', 2025, 123)).toBe('2025-00123');
      expect(formatInvoiceNumber('', 2025, 99999)).toBe('2025-99999');
    });

    it('should format number with prefix', () => {
      expect(formatInvoiceNumber('FV-', 2025, 1)).toBe('FV-2025-00001');
      expect(formatInvoiceNumber('INV-', 2025, 456)).toBe('INV-2025-00456');
    });

    it('should pad sequence to 5 digits', () => {
      expect(formatInvoiceNumber('', 2025, 1)).toBe('2025-00001');
      expect(formatInvoiceNumber('', 2025, 12)).toBe('2025-00012');
      expect(formatInvoiceNumber('', 2025, 123)).toBe('2025-00123');
      expect(formatInvoiceNumber('', 2025, 1234)).toBe('2025-01234');
    });
  });

  describe('generateVariableSymbol', () => {
    it('should generate VS without prefix', () => {
      expect(generateVariableSymbol('2025-00001')).toBe('0202500001');
      expect(generateVariableSymbol('2025-00123')).toBe('0202500123');
    });

    it('should generate VS with prefix (removes prefix)', () => {
      expect(generateVariableSymbol('FV-2025-00001')).toBe('0202500001');
      expect(generateVariableSymbol('INV-2025-00456')).toBe('0202500456');
    });

    it('should pad VS to 10 digits', () => {
      const vs = generateVariableSymbol('2025-00001');
      expect(vs).toHaveLength(10);
      expect(vs).toBe('0202500001');
    });

    it('should throw error for invalid format', () => {
      expect(() => generateVariableSymbol('invalid')).toThrow('Invalid invoice number format');
      expect(() => generateVariableSymbol('2025')).toThrow('Invalid invoice number format');
    });
  });

  describe('parseInvoiceNumber', () => {
    it('should parse invoice number correctly', () => {
      expect(parseInvoiceNumber('2025-00001')).toEqual({ year: 2025, seq: 1 });
      expect(parseInvoiceNumber('2025-00123')).toEqual({ year: 2025, seq: 123 });
      expect(parseInvoiceNumber('FV-2025-00456')).toEqual({ year: 2025, seq: 456 });
    });

    it('should throw error for invalid format', () => {
      expect(() => parseInvoiceNumber('invalid')).toThrow('Invalid invoice number format');
      expect(() => parseInvoiceNumber('2025-123')).toThrow('Invalid invoice number format');
    });
  });
});



