import type { BusinessPortalData } from "@/models/businessPortal";
import { apiRequest } from "@/services/apiClient";
import { capabilitiesForRole, type PortalCapability } from "@/lib/businessAccess";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const number = (value: unknown) => Number(value ?? 0);
const date = (value: unknown) => value ? new Date(String(value)).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—";
const safe = async <T>(request: Promise<T>, fallback: T): Promise<T> => request.catch(() => fallback);

export const businessManagementService = {
  async getPortalData(businessId: string, entityId?: string, signal?: AbortSignal): Promise<BusinessPortalData> {
    const request = <T>(path: string) => apiRequest<T>(path, { signal });
    const [business, memberships, sessionUser] = await Promise.all([
      request<AnyRow>(`businesses/${businessId}`),
      request<AnyRow[]>("businesses"),
      request<AnyRow>("auth/me"),
    ]);
    const access = memberships.find((row) => row.business?.id === businessId && row.membership?.status === "ACTIVE");
    if (!access) throw new Error("You do not have an active membership for this business.");
    const role = String(access.membership.role);
    const granted = capabilitiesForRole(role);
    const has = (capability: PortalCapability) => granted.includes(capability);
    const [allBranches, dashboard, menuCategories, coupons, members, reviews, audit, ingredients] = await Promise.all([
      request<AnyRow[]>(`businesses/${businessId}/branches`),
      safe(request<AnyRow>(`businesses/${businessId}/dashboard`), {}),
      has("menu.manage") ? safe(request<AnyRow[]>(`businesses/${businessId}/menu`), []) : [],
      has("coupon.manage") ? safe(request<AnyRow[]>(`businesses/${businessId}/coupons`), []) : [],
      has("member.manage") ? safe(request<AnyRow[]>(`businesses/${businessId}/members`), []) : [],
      has("review.read") ? safe(request<AnyRow[]>(`businesses/${businessId}/reviews?limit=100`), []) : [],
      has("audit.read") ? safe(request<AnyRow[]>(`businesses/${businessId}/audit-logs?limit=100`), []) : [],
      has("inventory.manage") ? safe(request<AnyRow[]>(`businesses/${businessId}/inventory/ingredients`), []) : [],
    ]);
    const unrestrictedBranches = ["OWNER", "ADMIN"].includes(role);
    const allowedBranchIds = new Set<string>(access.membership.branchIds ?? []);
    const branches = unrestrictedBranches ? allBranches : allBranches.filter((branch) => allowedBranchIds.has(branch.id));
    const selectedBranchId = entityId && branches.some((b) => b.id === entityId) ? entityId : branches[0]?.id;
    const [inventory, hours, orderPages] = await Promise.all([
      selectedBranchId ? safe(request<AnyRow[]>(`businesses/${businessId}/branches/${selectedBranchId}/inventory`), []) : [],
      selectedBranchId ? safe(request<AnyRow>(`businesses/${businessId}/branches/${selectedBranchId}/hours`), {} as AnyRow) : ({} as AnyRow),
      has("order.read") ? Promise.all(branches.map((branch) => safe(request<AnyRow>(`businesses/${businessId}/branches/${branch.id}/orders?limit=100`), { items: [] }))) : [],
    ]);
    const orders = orderPages.flatMap((page) => page.items ?? []);
    const branchNames = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]));
    const itemRows = menuCategories.flatMap((category) => (category.items ?? []).map((item: AnyRow) => ({ category, item })));
    const modifierMap = new Map<string, AnyRow>();
    for (const { item } of itemRows) for (const group of item.modifierGroups ?? []) modifierMap.set(group.id, group);
    const inventoryMap = new Map(inventory.map((item) => [item.ingredientId, item]));
    const activeDeliveries = orders.filter((o) => o.fulfillmentType === "DELIVERY" && !["COMPLETED", "CANCELLED", "REJECTED"].includes(o.status));

    return {
      business: { id: business.id, name: business.displayName, legalName: business.legalName, slug: business.slug, currency: business.defaultCurrency, taxRegistrationNo: business.taxRegistrationNo ?? "", supportEmail: "", supportPhone: "", timezone: business.timezone },
      user: { name: [sessionUser.firstName, sessionUser.lastName].filter(Boolean).join(" ") || sessionUser.email || sessionUser.phone || "Staff member", role: role.replaceAll("_", " "), initials: ((sessionUser.firstName?.[0] ?? sessionUser.email?.[0] ?? "S") + (sessionUser.lastName?.[0] ?? "")).toUpperCase(), capabilities: granted },
      branches: branches.map((branch) => ({ id: branch.id, name: branch.name, code: branch.code, city: branch.city, address: [branch.addressLine1, branch.addressLine2, branch.province, branch.postalCode].filter(Boolean).join(", "), phone: branch.phone ?? "—", active: branch.isActive, acceptingOrders: branch.isAcceptingOrders, openNow: branch.isOpenNow, fulfillment: ["Delivery", "Pickup"] })),
      dashboard: { ordersToday: dashboard.today?.orders ?? 0, revenueToday: number(dashboard.today?.revenue), preparing: dashboard.ordersByStatus?.PREPARING ?? 0, awaitingConfirmation: dashboard.ordersByStatus?.PLACED ?? 0, ready: dashboard.ordersByStatus?.READY ?? 0, activeDeliveries: activeDeliveries.length, lowStock: dashboard.lowStockItems ?? 0, paymentReview: orders.filter((o) => o.paymentStatus === "FAILED").length, hourlyOrders: [] },
      kitchen: orders.filter((o) => ["CONFIRMED", "PREPARING"].includes(o.status)).map((o) => ({ id: o.publicId, branchId: o.branchId, orderNumber: String(o.orderNumber ?? o.publicId), status: o.status, ageMinutes: Math.max(0, Math.floor((Date.now() - Date.parse(o.placedAt)) / 60000)), fulfillment: o.fulfillmentType, items: (o.items ?? []).map((item: AnyRow) => ({ quantity: item.quantity, name: `${item.itemName} — ${item.variantName}`, modifiers: (item.modifiers ?? []).map((m: AnyRow) => m.optionName) })), note: o.customerNote ?? undefined })),
      menu: itemRows.map(({ category, item }) => ({ id: item.id, categoryId: category.id, name: item.name, category: category.name, description: item.description ?? "", itemType: item.itemType ?? (item.isCombo ? "COMBO" : "STANDARD"), comboComponents: (item.comboComponents ?? []).map((component: AnyRow) => ({ variantId: component.variantId, quantity: component.quantity, itemName: component.itemName ?? component.variant?.menuItem?.name ?? "Menu item", variantName: component.variantName ?? component.variant?.name ?? "Regular" })), variants: (item.variants ?? []).map((variant: AnyRow) => ({ id: variant.id, sku: variant.sku, name: variant.name, price: number(variant.basePrice), isDefault: variant.isDefault, active: variant.isActive })), active: item.isActive, availableBranches: item.isActive ? branches.length : 0, branchCount: branches.length })),
      modifiers: [...modifierMap.values()].map((group) => ({ id: group.id, name: group.name, rule: group.isRequired ? `Required · ${group.minSelections}–${group.maxSelections}` : `Optional · Up to ${group.maxSelections}`, options: (group.options ?? []).map((option: AnyRow) => ({ name: option.name, priceDelta: number(option.priceDelta), active: option.isActive })), usedBy: itemRows.filter(({ item }) => (item.modifierGroups ?? []).some((g: AnyRow) => g.id === group.id)).length })),
      inventory: ingredients.map((ingredient) => { const row = inventoryMap.get(ingredient.id); return { id: row?.id ?? ingredient.id, ingredientId: ingredient.id, name: ingredient.name, sku: ingredient.id.slice(0, 8).toUpperCase(), unit: ingredient.unit, onHand: number(row?.quantityOnHand), reserved: number(row?.quantityReserved), reorderLevel: number(row?.reorderLevel), category: ingredient.isActive ? "Active" : "Inactive", lastMovement: row ? "Ledger balance" : "No movements yet" }; }),
      inventoryMovements: [],
      coupons: coupons.map((coupon) => ({ id: coupon.id, code: coupon.code, summary: `${coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : `${business.defaultCurrency} ${coupon.discountValue}`} off orders of ${business.defaultCurrency} ${coupon.minOrderAmount} or more${coupon.maxDiscount ? ` · Maximum ${business.defaultCurrency} ${coupon.maxDiscount}` : ""}`, type: coupon.discountType === "PERCENT" ? "Percentage" : "Fixed", value: number(coupon.discountValue), active: coupon.isActive, period: `${date(coupon.startsAt)} – ${date(coupon.endsAt)}`, usage: coupon.totalUsageLimit ? `Limit ${coupon.totalUsageLimit}` : "Unlimited", branches: coupon.branchId ? branchNames[coupon.branchId] ?? "Branch" : "All branches" })),
      payments: orders.flatMap((order) => (order.payments ?? []).map((payment: AnyRow) => ({ id: payment.id, orderPublicId: order.publicId, orderNumber: String(order.orderNumber ?? order.publicId), date: date(payment.createdAt), customer: order.customerName, method: payment.method, amount: number(payment.amount), provider: payment.provider ?? "Cash", status: payment.status, refunded: 0, branch: branchNames[order.branchId] ?? "—" }))),
      deliveries: activeDeliveries.map((order) => ({ id: order.delivery?.id ?? order.publicId, orderNumber: String(order.orderNumber ?? order.publicId), branch: branchNames[order.branchId] ?? "—", area: order.delivery?.addressLine1Snapshot ?? "Delivery address", state: order.delivery?.status ?? order.status, rider: "See rider app", riderState: order.delivery?.status ?? "Unassigned", elapsed: Math.max(0, Math.floor((Date.now() - Date.parse(order.placedAt)) / 60000)), eta: "—", locationAge: "—" })),
      reviews: reviews.map((review) => ({ id: review.id, customer: [review.customer?.firstName, review.customer?.lastName].filter(Boolean).join(" ") || "Customer", rating: review.foodRating, feedback: review.comment ?? "No written feedback", orderNumber: review.order?.publicId ?? "—", branch: branchNames[review.order?.branchId] ?? "—", date: date(review.createdAt) })),
      members: members.map((row) => ({ id: row.id, name: row.user.email ?? row.user.phone ?? "Staff member", contact: row.user.email ?? row.user.phone ?? "—", role: row.role.replaceAll("_", " "), branches: row.branchIds.length ? row.branchIds.map((id: string) => branchNames[id] ?? id) : ["All branches"], status: row.status[0] + row.status.slice(1).toLowerCase(), initials: (row.user.email ?? row.user.phone ?? "S").slice(0, 2).toUpperCase() })),
      audit: audit.map((row) => ({ id: row.id, timestamp: date(row.createdAt), actor: row.actorType, action: row.action, entity: `${row.entityType} ${row.entityId}`, change: row.after ? "Data changed" : "Event recorded", branch: row.branchId ? branchNames[row.branchId] ?? row.branchId : "All branches", reference: row.requestId ?? row.id })),
      notifications: [],
      weeklyHours: dayNames.map((day, dayOfWeek) => { const intervals = hours.weekly?.find((entry: AnyRow) => entry.dayOfWeek === dayOfWeek)?.intervals ?? []; return { day, enabled: intervals.length > 0, opens: intervals[0]?.opensAt ?? "09:00", closes: intervals[0]?.closesAt ?? "22:00" }; }),
      specialHours: (hours.special ?? []).map((row: AnyRow) => ({ date: row.date, label: row.note ?? "Special schedule", hours: row.isClosed ? "Closed" : `${row.opensAt} – ${row.closesAt}` })),
      categories: menuCategories.map((category) => ({ id: category.id, name: category.name, slug: category.slug, sortOrder: category.sortOrder, active: category.isActive })),
    };
  },
};
