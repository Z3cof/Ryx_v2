import { walletCurrencyFromDashboard, formatMoney, formatAmountCFA } from '../utils/currency';

describe('Currency and Money Formatting Utilities', () => {
  describe('walletCurrencyFromDashboard', () => {
    it('should return explicit currency if provided', () => {
      const result = walletCurrencyFromDashboard({ currency: 'EUR' });
      expect(result).toBe('EUR');
    });

    it('should infer currency from user countryIso if explicit currency is not provided', () => {
      const result = walletCurrencyFromDashboard({
        currency: '',
        user: { countryIso: 'FR' },
      });
      expect(result).toBe('EUR');
    });

    it('should fall back to XOF if no user or currency is specified', () => {
      const result = walletCurrencyFromDashboard(null);
      expect(result).toBe('XOF');
    });

    it('should handle lowercase and spaces gracefully', () => {
      const result = walletCurrencyFromDashboard({ currency: ' usd ' });
      expect(result).toBe('USD');
    });
  });

  describe('formatMoney', () => {
    it('should format money in French (fr) locale correctly', () => {
      const result = formatMoney(15000, 'XOF', 'fr');
      // In French, currency is usually formatted like '15 000 F CFA' or '15 000 XOF'.
      expect(result).toContain('15');
      expect(result).toMatch(/XOF|CFA/);
    });

    it('should format money in English (en) locale correctly', () => {
      const result = formatMoney(15000, 'USD', 'en');
      // In English, it usually formats as '$15,000' or 'USD 15,000'.
      expect(result).toContain('15');
      expect(result).toMatch(/USD|\$/);
    });
  });

  describe('formatAmountCFA', () => {
    it('should format amount as CFA with French locale', () => {
      const result = formatAmountCFA(5000);
      expect(result).toContain('5');
      expect(result).toMatch(/XOF|CFA/);
    });
  });
});
