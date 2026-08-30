import type { BusinessPageKind } from "@/models/businessPortal";

export type PortalCapability =
  | "dashboard.read" | "order.read" | "order.manage" | "order.confirm"
  | "order.prepare" | "order.cancel" | "kitchen.read"
  | "branch.manage" | "menu.manage" | "inventory.manage" | "coupon.manage"
  | "payment.manage" | "dispatch.read" | "review.read" | "member.manage"
  | "audit.read" | "business.manage";

const allCapabilities: PortalCapability[] = [
  "dashboard.read", "order.read", "order.manage", "order.confirm",
  "order.prepare", "order.cancel", "kitchen.read",
  "branch.manage", "menu.manage", "inventory.manage", "coupon.manage",
  "payment.manage", "dispatch.read", "review.read", "member.manage",
  "audit.read", "business.manage",
];

const roleCapabilities: Record<string, PortalCapability[]> = {
  OWNER: allCapabilities,
  ADMIN: allCapabilities,
  MANAGER: ["dashboard.read", "order.read", "order.manage", "order.confirm", "order.prepare", "order.cancel", "kitchen.read", "branch.manage", "menu.manage", "inventory.manage", "dispatch.read", "review.read"],
  CASHIER: ["dashboard.read", "order.read", "order.manage", "order.confirm", "payment.manage"],
  KITCHEN: ["dashboard.read", "order.read", "order.prepare", "kitchen.read"],
  SUPPORT: ["dashboard.read", "order.read", "order.manage", "order.cancel", "dispatch.read", "review.read"],
};

export const pageCapability: Record<BusinessPageKind, PortalCapability> = {
  dashboard: "dashboard.read",
  "order-detail": "order.read",
  kitchen: "kitchen.read",
  branches: "branch.manage",
  "branch-detail": "branch.manage",
  hours: "branch.manage",
  menu: "menu.manage",
  "menu-item": "menu.manage",
  modifiers: "menu.manage",
  "branch-menu": "menu.manage",
  inventory: "inventory.manage",
  "inventory-history": "inventory.manage",
  coupons: "coupon.manage",
  payments: "payment.manage",
  dispatch: "dispatch.read",
  reviews: "review.read",
  team: "member.manage",
  audit: "audit.read",
  settings: "business.manage",
  notifications: "dashboard.read",
};

export function capabilitiesForRole(role: string): PortalCapability[] {
  return roleCapabilities[role.toUpperCase()] ?? [];
}

export function canAccessPage(page: BusinessPageKind, capabilities: string[]): boolean {
  return capabilities.includes(pageCapability[page]);
}
