import type { BusinessOperationsData, BusinessOrder, OrderStatus } from "@/models/business";
import { apiRequest } from "@/services/apiClient";
import { capabilitiesForRole } from "@/lib/businessAccess";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export const businessPortalService = {
  async getOrderOperations(businessId: string, signal?: AbortSignal): Promise<BusinessOperationsData> {
    const request = <T>(path: string) => apiRequest<T>(path, { signal });
    const [business, allBranches, memberships, user] = await Promise.all([request<Row>(`businesses/${businessId}`), request<Row[]>(`businesses/${businessId}/branches`), request<Row[]>("businesses"), request<Row>("auth/me")]);
    const access = memberships.find((row) => row.business?.id === businessId && row.membership?.status === "ACTIVE");
    if (!access) throw new Error("You do not have an active membership for this business.");
    const role = String(access.membership.role);
    const capabilities = capabilitiesForRole(role);
    if (!capabilities.includes("order.read")) throw new Error("You do not have permission to view orders.");
    const unrestrictedBranches = ["OWNER", "ADMIN"].includes(role);
    const allowedBranchIds = new Set<string>(access.membership.branchIds ?? []);
    const branches = unrestrictedBranches ? allBranches : allBranches.filter((branch) => allowedBranchIds.has(branch.id));
    const pages = await Promise.all(branches.map((branch) => request<Row>(`businesses/${businessId}/branches/${branch.id}/orders?limit=100`).catch(() => ({ items: [] }))));
    const orders: BusinessOrder[] = pages.flatMap((page) => page.items ?? []).map((order: Row) => ({ id: order.publicId, orderNumber: String(order.orderNumber ?? order.publicId), branchId: order.branchId, customerName: order.customerName ?? "Customer", status: order.status as OrderStatus, fulfillmentType: order.fulfillmentType, paymentState: order.paymentStatus === "CAPTURED" ? "CAPTURED" : order.payments?.some((p: Row) => p.method === "COD") ? "COD" : "PENDING", paymentMethod: order.payments?.[0]?.method ?? order.paymentStatus, itemCount: (order.items ?? []).reduce((sum: number, item: Row) => sum + item.quantity, 0), total: Number(order.grandTotal), ageMinutes: Math.max(0, Math.floor((Date.now() - Date.parse(order.placedAt)) / 60000)), scheduledFor: order.scheduledFor ?? undefined, note: order.customerNote ?? undefined, riderState: order.delivery?.status ?? undefined, items: order.items }));
    return { business: { id: business.id, name: business.displayName }, user: { name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Staff member", role: role.replaceAll("_", " "), initials: `${user.firstName?.[0] ?? user.email?.[0] ?? "S"}${user.lastName?.[0] ?? ""}`.toUpperCase(), capabilities }, branches: [{ id: "all", name: "All branches", city: "", isAcceptingOrders: branches.some((b) => b.isAcceptingOrders) }, ...branches.map((b) => ({ id: b.id, name: b.name, city: b.city, isAcceptingOrders: b.isAcceptingOrders }))], orders, averagePrepMinutes: branches.length ? Math.round(branches.reduce((sum, b) => sum + b.defaultPrepMinutes, 0) / branches.length) : 0, updatedAt: new Date().toISOString() };
  },
};
