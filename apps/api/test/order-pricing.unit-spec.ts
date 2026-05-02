import { calculateLineTotal, calculateTotals } from '../src/common/utils/pricing';

describe('pricing utilities', () => {
  it('calculates a bucket line total with add-ons and variants', () => {
    expect(
      calculateLineTotal({
        addons: [{ priceDelta: 10 }],
        price: 120,
        quantity: 2,
        variantPriceDelta: 20,
      }),
    ).toBe(300);
  });

  it('calculates totals including tax', () => {
    expect(
      calculateTotals([
        { price: 100, quantity: 1 },
        { addons: [{ priceDelta: 20 }], price: 80, quantity: 2 },
      ]),
    ).toEqual({
      grandTotal: 315,
      subtotal: 300,
      taxTotal: 15,
    });
  });
});

