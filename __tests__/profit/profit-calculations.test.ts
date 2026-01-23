// __tests__/profit/profit-calculations.test.ts - Profit calculation tests

describe('Profit Calculations', () => {
  describe('Margin Calculation', () => {
    it('should calculate profit margin correctly', () => {
      const costPrice = 80;
      const sellingPrice = 100;
      const profitMargin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      expect(profitMargin).toBe(20);
    });

    it('should calculate profit amount', () => {
      const costPrice = 75;
      const sellingPrice = 100;
      const quantity = 10;

      const profitPerUnit = sellingPrice - costPrice;
      const totalProfit = profitPerUnit * quantity;

      expect(profitPerUnit).toBe(25);
      expect(totalProfit).toBe(250);
    });

    it('should handle zero profit scenario', () => {
      const costPrice = 100;
      const sellingPrice = 100;

      const profit = sellingPrice - costPrice;
      const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      expect(profit).toBe(0);
      expect(margin).toBe(0);
    });

    it('should detect loss scenario', () => {
      const costPrice = 120;
      const sellingPrice = 100;

      const profit = sellingPrice - costPrice;

      expect(profit).toBeLessThan(0);
      expect(profit).toBe(-20);
    });
  });

  describe('Partner Commission Calculation', () => {
    it('should calculate partner commission correctly', () => {
      const sellingPrice = 100;
      const costPrice = 80;
      const commissionRate = 30; // 30%

      const grossProfit = sellingPrice - costPrice;
      const partnerCommission = grossProfit * (commissionRate / 100);
      const netProfit = grossProfit - partnerCommission;

      expect(grossProfit).toBe(20);
      expect(partnerCommission).toBe(6);
      expect(netProfit).toBe(14);
    });

    it('should handle 0% commission', () => {
      const sellingPrice = 100;
      const costPrice = 80;
      const commissionRate = 0;

      const grossProfit = sellingPrice - costPrice;
      const partnerCommission = grossProfit * (commissionRate / 100);

      expect(partnerCommission).toBe(0);
      expect(grossProfit).toBe(20);
    });

    it('should handle 100% commission', () => {
      const sellingPrice = 100;
      const costPrice = 80;
      const commissionRate = 100;

      const grossProfit = sellingPrice - costPrice;
      const partnerCommission = grossProfit * (commissionRate / 100);
      const netProfit = grossProfit - partnerCommission;

      expect(partnerCommission).toBe(20);
      expect(netProfit).toBe(0);
    });

    it('should calculate commission for multiple products', () => {
      const products = [
        { sellingPrice: 100, costPrice: 80, quantity: 2, commissionRate: 30 },
        { sellingPrice: 200, costPrice: 150, quantity: 1, commissionRate: 25 },
        { sellingPrice: 50, costPrice: 40, quantity: 5, commissionRate: 20 },
      ];

      let totalCommission = 0;

      products.forEach((product) => {
        const grossProfit = (product.sellingPrice - product.costPrice) * product.quantity;
        const commission = grossProfit * (product.commissionRate / 100);
        totalCommission += commission;
      });

      // Product 1: (100-80) * 2 * 0.30 = 12
      // Product 2: (200-150) * 1 * 0.25 = 12.5
      // Product 3: (50-40) * 5 * 0.20 = 10
      // Total: 34.5

      expect(totalCommission).toBe(34.5);
    });
  });

  describe('Order Level Profit', () => {
    it('should calculate total order profit', () => {
      const items = [
        { costPrice: 80, sellingPrice: 100, quantity: 2 },
        { costPrice: 50, sellingPrice: 75, quantity: 3 },
        { costPrice: 30, sellingPrice: 40, quantity: 5 },
      ];

      const totalProfit = items.reduce((sum, item) => {
        const profitPerUnit = item.sellingPrice - item.costPrice;
        return sum + profitPerUnit * item.quantity;
      }, 0);

      // Item 1: (100-80) * 2 = 40
      // Item 2: (75-50) * 3 = 75
      // Item 3: (40-30) * 5 = 50
      // Total: 165

      expect(totalProfit).toBe(165);
    });

    it('should account for discounts in profit calculation', () => {
      const costPrice = 80;
      const listPrice = 100;
      const discount = 10; // 10%
      const quantity = 5;

      const discountedPrice = listPrice * (1 - discount / 100);
      const profitPerUnit = discountedPrice - costPrice;
      const totalProfit = profitPerUnit * quantity;

      expect(discountedPrice).toBe(90);
      expect(profitPerUnit).toBe(10);
      expect(totalProfit).toBe(50);
    });

    it('should account for shipping costs', () => {
      const itemsProfit = 100;
      const shippingCost = 15;

      const netProfit = itemsProfit - shippingCost;

      expect(netProfit).toBe(85);
    });

    it('should account for platform fees', () => {
      const grossProfit = 100;
      const platformFeeRate = 5; // 5%

      const platformFee = grossProfit * (platformFeeRate / 100);
      const netProfit = grossProfit - platformFee;

      expect(platformFee).toBe(5);
      expect(netProfit).toBe(95);
    });
  });

  describe('Tiered Pricing Profit', () => {
    it('should calculate profit for tiered pricing', () => {
      const costPrice = 80;
      const tiers = [
        { minQuantity: 1, maxQuantity: 9, price: 100 },
        { minQuantity: 10, maxQuantity: 49, price: 95 },
        { minQuantity: 50, maxQuantity: undefined, price: 90 },
      ];

      // Order 5 units - Tier 1
      const quantity1 = 5;
      const price1 = 100;
      const profit1 = (price1 - costPrice) * quantity1;
      expect(profit1).toBe(100);

      // Order 25 units - Tier 2
      const quantity2 = 25;
      const price2 = 95;
      const profit2 = (price2 - costPrice) * quantity2;
      expect(profit2).toBe(375);

      // Order 100 units - Tier 3
      const quantity3 = 100;
      const price3 = 90;
      const profit3 = (price3 - costPrice) * quantity3;
      expect(profit3).toBe(1000);
    });
  });

  describe('Profit Margin Categories', () => {
    it('should categorize high margin products', () => {
      const costPrice = 50;
      const sellingPrice = 100;
      const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      expect(margin).toBeGreaterThanOrEqual(40); // High margin
    });

    it('should categorize medium margin products', () => {
      const costPrice = 75;
      const sellingPrice = 100;
      const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      expect(margin).toBeGreaterThanOrEqual(20);
      expect(margin).toBeLessThan(40);
    });

    it('should categorize low margin products', () => {
      const costPrice = 90;
      const sellingPrice = 100;
      const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      expect(margin).toBeLessThan(20);
    });
  });

  describe('Date Range Profit Aggregation', () => {
    it('should aggregate profits for a date range', () => {
      const orders = [
        { date: '2026-01-15', profit: 100 },
        { date: '2026-01-16', profit: 150 },
        { date: '2026-01-17', profit: 200 },
      ];

      const totalProfit = orders.reduce((sum, order) => sum + order.profit, 0);
      const averageProfit = totalProfit / orders.length;

      expect(totalProfit).toBe(450);
      expect(averageProfit).toBe(150);
    });

    it('should calculate daily profit breakdown', () => {
      const orders = [
        { date: '2026-01-15', profit: 100 },
        { date: '2026-01-15', profit: 50 },
        { date: '2026-01-16', profit: 200 },
      ];

      const dailyProfit: Record<string, number> = {};

      orders.forEach((order) => {
        if (!dailyProfit[order.date]) {
          dailyProfit[order.date] = 0;
        }
        dailyProfit[order.date] += order.profit;
      });

      expect(dailyProfit['2026-01-15']).toBe(150);
      expect(dailyProfit['2026-01-16']).toBe(200);
    });
  });

  describe('Profit with Tax', () => {
    it('should calculate profit after tax', () => {
      const grossProfit = 100;
      const taxRate = 15; // 15%

      const tax = grossProfit * (taxRate / 100);
      const netProfitAfterTax = grossProfit - tax;

      expect(tax).toBe(15);
      expect(netProfitAfterTax).toBe(85);
    });
  });

  describe('ROI Calculation', () => {
    it('should calculate return on investment', () => {
      const costPrice = 80;
      const sellingPrice = 100;

      const profit = sellingPrice - costPrice;
      const roi = (profit / costPrice) * 100;

      expect(roi).toBe(25); // 25% ROI
    });

    it('should handle negative ROI', () => {
      const costPrice = 100;
      const sellingPrice = 80;

      const profit = sellingPrice - costPrice;
      const roi = (profit / costPrice) * 100;

      expect(roi).toBe(-20); // -20% ROI (loss)
    });
  });
});
