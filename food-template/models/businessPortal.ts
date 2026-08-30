export type BusinessPageKind =
  | "dashboard" | "order-detail" | "kitchen" | "branches" | "branch-detail"
  | "hours" | "menu" | "menu-item" | "modifiers" | "branch-menu" | "inventory"
  | "inventory-history" | "coupons" | "payments" | "dispatch" | "reviews"
  | "team" | "audit" | "settings" | "notifications";

export interface PortalBranch {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  active: boolean;
  acceptingOrders: boolean;
  openNow: boolean;
  fulfillment: string[];
}

export interface KitchenTicket {
  id: string;
  branchId: string;
  orderNumber: string;
  status: "CONFIRMED" | "PREPARING";
  ageMinutes: number;
  fulfillment: string;
  items: Array<{ quantity: number; name: string; modifiers: string[] }>;
  note?: string;
}

export interface MenuItemRecord {
  id: string;
  categoryId: string;
  name: string;
  category: string;
  description: string;
  itemType: "STANDARD" | "DEAL" | "COMBO";
  comboComponents: Array<{ variantId: string; quantity: number; itemName: string; variantName: string }>;
  variants: Array<{ id: string; sku: string; name: string; price: number; isDefault: boolean; active: boolean }>;
  active: boolean;
  availableBranches: number;
  branchCount: number;
}

export interface InventoryRecord {
  id: string;
  ingredientId: string;
  name: string;
  sku: string;
  unit: string;
  onHand: number;
  reserved: number;
  reorderLevel: number;
  category: string;
  lastMovement: string;
}

export interface BusinessPortalData {
  business: { id: string; name: string; legalName: string; slug: string; currency: string; taxRegistrationNo: string; supportEmail: string; supportPhone: string; timezone: string };
  user: { name: string; role: string; initials: string; capabilities: string[] };
  branches: PortalBranch[];
  dashboard: { ordersToday: number; revenueToday: number; preparing: number; awaitingConfirmation: number; ready: number; activeDeliveries: number; lowStock: number; paymentReview: number; hourlyOrders: number[] };
  kitchen: KitchenTicket[];
  menu: MenuItemRecord[];
  modifiers: Array<{ id: string; name: string; rule: string; options: Array<{ name: string; priceDelta: number; active: boolean }>; usedBy: number }>;
  inventory: InventoryRecord[];
  inventoryMovements: Array<{ id: string; time: string; ingredient: string; type: string; change: number; reference: string; actor: string; result: number }>;
  coupons: Array<{ id: string; code: string; summary: string; type: string; value: number; active: boolean; period: string; usage: string; branches: string }>;
  payments: Array<{ id: string; orderPublicId: string; orderNumber: string; date: string; customer: string; method: string; amount: number; provider: string; status: string; refunded: number; branch: string }>;
  deliveries: Array<{ id: string; orderNumber: string; branch: string; area: string; state: string; rider: string; riderState: string; elapsed: number; eta: string; locationAge: string }>;
  reviews: Array<{ id: string; customer: string; rating: number; feedback: string; orderNumber: string; branch: string; date: string }>;
  members: Array<{ id: string; name: string; contact: string; role: string; branches: string[]; status: string; initials: string }>;
  audit: Array<{ id: string; timestamp: string; actor: string; action: string; entity: string; change: string; branch: string; reference: string }>;
  notifications: Array<{ id: string; type: string; title: string; detail: string; time: string; read: boolean }>;
  weeklyHours: Array<{ day: string; enabled: boolean; opens: string; closes: string }>;
  specialHours: Array<{ date: string; label: string; hours: string }>;
  categories: Array<{ id: string; name: string; slug: string; sortOrder: number; active: boolean }>;
}
