import {
  Activity,
  Armchair,
  Building2,
  CalendarClock,
  ChartLine,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  ConciergeBell,
  CookingPot,
  CreditCard,
  Crown,
  FileSearch,
  Headset,
  LayoutDashboard,
  LayoutGrid,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Tags,
  UserCog,
  Users,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

/**
 * Bridges the icon names stored in the shared screen registry (Material Symbols
 * ligature names) to lucide components, so `packages/shared` stays untouched.
 */
export const ICONS: Record<string, LucideIcon> = {
  admin_panel_settings: ShieldCheck,
  apartment: Building2,
  assignment: ClipboardList,
  category: Tags,
  concierge: ConciergeBell,
  dashboard: LayoutDashboard,
  fact_check: ClipboardCheck,
  floor: LayoutGrid,
  group: Users,
  groups: Users,
  insights: ChartLine,
  manage_search: FileSearch,
  monitor_heart: Activity,
  payments: CreditCard,
  receipt_long: ReceiptText,
  restaurant: Utensils,
  restaurant_menu: UtensilsCrossed,
  schedule: CalendarClock,
  settings: Settings,
  shield_person: UserCog,
  shopping_basket: ShoppingBasket,
  skillet: CookingPot,
  storefront: Store,
  support_agent: Headset,
  table_restaurant: Armchair,
  workspace_premium: Crown,
};

export const FALLBACK_ICON: LucideIcon = CircleHelp;

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? FALLBACK_ICON;
}
