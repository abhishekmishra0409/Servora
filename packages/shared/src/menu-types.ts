export interface MenuSubcategory {
  id: string;
  name: string;
  sortOrder: number;
  visible: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: MenuSubcategory[];
  visible: boolean;
}

export interface MenuVariant {
  id: string;
  label: string;
  priceDelta: number;
}

export interface AddonOption {
  id: string;
  label: string;
  priceDelta: number;
}

export interface AddonGroup {
  id: string;
  label: string;
  maxSelections: number;
  minSelections: number;
  options: AddonOption[];
}

export interface AvailabilityWindow {
  days: string[];
  endTime: string;
  startTime: string;
}

export interface BranchOverride {
  branchId: string;
  available: boolean;
  priceOverride?: number;
}

export interface MenuItem {
  addonGroups: AddonGroup[];
  allergens: string[];
  available: boolean;
  branchOverrides: BranchOverride[];
  categoryId: string;
  description: string;
  dietaryFlags: string[];
  id: string;
  imageUrl?: string;
  name: string;
  price: number;
  schedules: AvailabilityWindow[];
  slug: string;
  subcategoryId?: string;
  variants: MenuVariant[];
}

