export interface BasketLineInput {
  addons?: { priceDelta: number }[];
  price: number;
  quantity: number;
  variantPriceDelta?: number;
}

export interface BasketTotals {
  grandTotal: number;
  subtotal: number;
  taxTotal: number;
}

export const calculateLineTotal = (line: BasketLineInput): number => {
  const addonsTotal = (line.addons ?? []).reduce((total, addon) => total + addon.priceDelta, 0);
  return Number(((line.price + (line.variantPriceDelta ?? 0) + addonsTotal) * line.quantity).toFixed(2));
};

export const calculateTotals = (lines: BasketLineInput[], taxRate = 0.05): BasketTotals => {
  const subtotal = lines.reduce((total, line) => total + calculateLineTotal(line), 0);
  const taxTotal = Number((subtotal * taxRate).toFixed(2));

  return {
    grandTotal: Number((subtotal + taxTotal).toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    taxTotal,
  };
};

