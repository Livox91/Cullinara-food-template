"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgePercent,
  Bell,
  Bike,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  CircleGauge,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquareText,
  Package,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  SlidersHorizontal,
  Store,
  Users,
  Utensils,
  Wifi,
  X,
} from "lucide-react";
import type { BusinessOperationsData, BusinessOrder, OrderStatus } from "@/models/business";
import type { FulfillmentFilter, StatusFilter } from "@/components/controllers/BusinessOrdersController";

interface BusinessOrdersViewProps {
  businessId: string;
  data: BusinessOperationsData;
  orders: BusinessOrder[];
  branchOrders: BusinessOrder[];
  selectedBranchId: string;
  statusFilter: StatusFilter;
  fulfillmentFilter: FulfillmentFilter;
  query: string;
  isRefreshing: boolean;
  error: string | null;
  onBranchChange: (branchId: string) => void;
  onStatusChange: (status: StatusFilter) => void;
  onFulfillmentChange: (fulfillment: FulfillmentFilter) => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onCommand: (order: BusinessOrder, command: string, reason?: string) => Promise<void>;
}

interface NavigationItem {
  label: string;
  icon: LucideIcon;
  capability: string;
  path: string;
}

const navigation: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, capability: "dashboard.read", path: "" },
  { label: "Live orders", icon: ClipboardList, capability: "order.read", path: "/orders" },
  { label: "Kitchen", icon: ChefHat, capability: "kitchen.read", path: "/kitchen" },
  { label: "Menu", icon: Utensils, capability: "menu.manage", path: "/menu" },
  { label: "Branches", icon: Store, capability: "branch.manage", path: "/branches" },
  { label: "Inventory", icon: Package, capability: "inventory.manage", path: "/branches/f7/inventory" },
  { label: "Coupons", icon: BadgePercent, capability: "coupon.manage", path: "/coupons" },
  { label: "Payments", icon: CreditCard, capability: "payment.manage", path: "/payments" },
  { label: "Dispatch", icon: Bike, capability: "dispatch.read", path: "/dispatch" },
  { label: "Reviews", icon: MessageSquareText, capability: "review.read", path: "/reviews" },
  { label: "Team", icon: Users, capability: "member.manage", path: "/team" },
  { label: "Audit log", icon: ScrollText, capability: "audit.read", path: "/audit" },
  { label: "Settings", icon: Settings, capability: "business.manage", path: "/settings" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "PLACED", label: "New" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ALL", label: "All" },
];

const statusLabels: Record<OrderStatus, string> = {
  PLACED: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

function PermissionGate({ capability, granted, children }: { capability: string; granted: string[]; children: React.ReactNode }) {
  return granted.includes(capability) ? children : null;
}

function Sidebar({ businessId, capabilities, mobileOpen, onClose }: { businessId: string; capabilities: string[]; mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <div className={`portal-scrim ${mobileOpen ? "visible" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`business-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="portal-brand"><span className="portal-brand-mark"><Utensils size={20} /></span><span>Culinara <small>OPERATIONS</small></span><button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={20} /></button></div>
        <nav aria-label="Business portal navigation">
          <p className="nav-caption">Workspace</p>
          {navigation.map((item) => (
            <PermissionGate key={item.label} capability={item.capability} granted={capabilities}>
              <a className={`portal-nav-item ${item.path === "/orders" ? "active" : ""}`} href={`/business/${businessId}${item.path}`} onClick={onClose}><item.icon size={18} /><span>{item.label}</span>{item.path === "/orders" && <span className="nav-live-dot" aria-label="Live" />}</a>
            </PermissionGate>
          ))}
        </nav>
        <div className="sidebar-support"><CircleGauge size={20} /><div><strong>Service health</strong><span>All systems operational</span></div><span className="health-dot" /></div>
      </aside>
    </>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`order-status status-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

function Age({ minutes }: { minutes: number }) {
  const urgency = minutes >= 20 ? "critical" : minutes >= 12 ? "warning" : "normal";
  return <span className={`order-age age-${urgency}`}><Clock3 size={14} />{minutes} min</span>;
}

function PaymentBadge({ order }: { order: BusinessOrder }) {
  return <span className={`payment-badge payment-${order.paymentState.toLowerCase()}`}>{order.paymentState === "COD" ? "COD" : order.paymentState === "CAPTURED" ? "Paid" : "Pending"}</span>;
}

function OrdersTable({ orders, branches, onSelect }: { orders: BusinessOrder[]; branches: BusinessOperationsData["branches"]; onSelect: (order: BusinessOrder) => void }) {
  const branchNames = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])), [branches]);
  if (!orders.length) {
    return <div className="portal-empty"><ClipboardList size={28} /><h3>No matching orders</h3><p>Try changing the branch, status, or search filters.</p></div>;
  }

  return (
    <>
      <div className="orders-table-wrap">
        <table className="orders-table">
          <thead><tr><th>Order</th><th>Status</th><th>Customer</th><th>Type</th><th>Payment</th><th>Total</th><th>Waiting</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{orders.map((order) => (
            <tr key={order.id} onClick={() => onSelect(order)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onSelect(order)}>
              <td><strong>#{order.orderNumber}</strong><span>{branchNames[order.branchId]}</span></td>
              <td><StatusBadge status={order.status} /></td>
              <td><strong>{order.customerName}</strong><span>{order.itemCount} {order.itemCount === 1 ? "item" : "items"}</span></td>
              <td><span className="type-cell">{order.fulfillmentType === "DELIVERY" ? <Bike size={15} /> : <MapPin size={15} />}{order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}</span></td>
              <td><PaymentBadge order={order} /><span>{order.paymentMethod}</span></td>
              <td><strong>Rs {order.total.toLocaleString("en-PK")}</strong></td>
              <td><Age minutes={order.ageMinutes} /></td>
              <td><button className="row-action" onClick={(event) => { event.stopPropagation(); onSelect(order); }}>View</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mobile-order-list">{orders.map((order) => (
        <button className="mobile-order-card" key={order.id} onClick={() => onSelect(order)}>
          <div><strong>#{order.orderNumber}</strong><Age minutes={order.ageMinutes} /></div>
          <div><span>{order.customerName} · {order.itemCount} items</span><StatusBadge status={order.status} /></div>
          <div><span>{order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"} · {order.paymentState === "COD" ? "COD" : "Paid"}</span><strong>Rs {order.total.toLocaleString("en-PK")}</strong></div>
        </button>
      ))}</div>
    </>
  );
}

function OrderQuickView({ businessId, order, capabilities, onClose, onCommand }: { businessId: string; order: BusinessOrder; capabilities: string[]; onClose: () => void; onCommand: (order: BusinessOrder, command: string, reason?: string) => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function command(name: string, needsReason = false) {
    const reason = needsReason ? window.prompt(`${name === "reject" ? "Reject" : "Cancel"} reason`)?.trim() : undefined;
    if (needsReason && !reason) return;
    setPending(true); setError("");
    try { await onCommand(order, name, reason); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Order command failed."); setPending(false); }
  }
  return (
    <div className="quick-view" role="dialog" aria-modal="true" aria-label={`Order ${order.orderNumber}`}>
      <div className="quick-view-header"><div><span>ORDER</span><h2>#{order.orderNumber}</h2></div><button onClick={onClose} aria-label="Close order details"><X size={21} /></button></div>
      <StatusBadge status={order.status} />
      <div className="quick-view-grid"><div><span>Customer</span><strong>{order.customerName}</strong></div><div><span>Waiting</span><strong>{order.ageMinutes} minutes</strong></div><div><span>Fulfillment</span><strong>{order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}</strong></div><div><span>Payment</span><strong>{order.paymentMethod}</strong></div></div>
      {order.note && <div className="order-note"><AlertTriangle size={17} /><div><span>Order note</span><p>{order.note}</p></div></div>}
      <div className="quick-view-total"><span>{order.itemCount} items</span><strong>Rs {order.total.toLocaleString("en-PK")}</strong></div>
      <div className="quick-view-footer"><p>Use explicit commands; the backend validates every legal state transition.</p>{error && <div className="portal-inline-error">{error}</div>}{capabilities.includes("order.confirm") && order.status === "PLACED" && <><button disabled={pending} onClick={() => void command("confirm")}>Confirm order</button><button disabled={pending} onClick={() => void command("reject", true)}>Reject order</button></>}{capabilities.includes("order.prepare") && order.status === "CONFIRMED" && <button disabled={pending} onClick={() => void command("start-preparing")}>Start preparing</button>}{capabilities.includes("order.prepare") && order.status === "PREPARING" && <button disabled={pending} onClick={() => void command("ready")}>Mark ready</button>}{capabilities.includes("order.prepare") && order.status === "READY" && order.fulfillmentType === "PICKUP" && <button disabled={pending} onClick={() => void command("complete-pickup")}>Complete pickup</button>}{capabilities.includes("order.cancel") && ["PLACED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(order.status) && <button disabled={pending} onClick={() => void command("cancel", true)}>Cancel order</button>}<Link href={`/business/${businessId}/orders/${order.id}`}>Open full order</Link><button onClick={onClose}>Close</button></div>
    </div>
  );
}

export function BusinessOrdersView(props: BusinessOrdersViewProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BusinessOrder | null>(null);
  const currentBranch = props.data.branches.find((branch) => branch.id === props.selectedBranchId) ?? props.data.branches[0];
  const counts = {
    placed: props.branchOrders.filter((order) => order.status === "PLACED").length,
    preparing: props.branchOrders.filter((order) => order.status === "PREPARING").length,
    ready: props.branchOrders.filter((order) => order.status === "READY").length,
  };

  return (
    <div className="business-portal" data-business-id={props.businessId}>
      <Sidebar businessId={props.businessId} capabilities={props.data.user.capabilities} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="portal-workspace">
        <header className="business-topbar">
          <button className="mobile-nav-trigger" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <label className="business-switcher"><span>Business</span><strong>{props.data.business.name}</strong><ChevronDown size={15} /></label>
          <span className="topbar-divider" />
          <label className="branch-switcher"><span>Branch</span><select value={props.selectedBranchId} onChange={(event) => props.onBranchChange(event.target.value)}>{props.data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.city ? ` · ${branch.city}` : ""}</option>)}</select><ChevronDown size={15} /></label>
          <div className="topbar-spacer" />
          <div className={`acceptance-pill ${currentBranch.isAcceptingOrders ? "accepting" : "paused"}`}><span />{props.selectedBranchId === "all" ? "2 of 3 accepting" : currentBranch.isAcceptingOrders ? "Accepting orders" : "Orders paused"}</div>
          <button className="notification-button" aria-label="Notifications"><Bell size={19} /><span>3</span></button>
          <button className="user-menu"><span className="avatar">{props.data.user.initials}</span><span><strong>{props.data.user.name}</strong><small>{props.data.user.role}</small></span><ChevronDown size={15} /></button>
        </header>

        <main className="portal-main">
          <div className="portal-page-heading"><div><span className="breadcrumb">Operations / Live orders</span><h1>Live orders</h1><p>Track every active order and surface what needs attention first.</p></div><div className="live-sync"><Wifi size={15} /><span>Live sync</span><small>Every 15 seconds</small></div></div>

          {props.error && <div className="portal-inline-error"><AlertTriangle size={17} /><span>Latest refresh failed. Showing the most recent order data.</span><button onClick={props.onRefresh}>Retry</button></div>}

          <section className="operations-summary" aria-label="Order summary">
            <button onClick={() => props.onStatusChange("PLACED")} className="summary-card summary-new"><span className="summary-icon"><Bell size={19} /></span><span><small>Needs confirmation</small><strong>{counts.placed}</strong><em>{counts.placed ? "Action required" : "Queue clear"}</em></span></button>
            <button onClick={() => props.onStatusChange("PREPARING")} className="summary-card summary-preparing"><span className="summary-icon"><ChefHat size={19} /></span><span><small>Preparing now</small><strong>{counts.preparing}</strong><em>Across selected branches</em></span></button>
            <button onClick={() => props.onStatusChange("READY")} className="summary-card summary-ready"><span className="summary-icon"><CheckCircle2 size={19} /></span><span><small>Ready for handoff</small><strong>{counts.ready}</strong><em>Pickup or rider handoff</em></span></button>
            <div className="summary-card summary-time"><span className="summary-icon"><Clock3 size={19} /></span><span><small>Average prep time</small><strong>{props.data.averagePrepMinutes}<sup> min</sup></strong><em>Target: under 20 min</em></span></div>
          </section>

          <section className="orders-panel" id="orders-table">
            <div className="orders-panel-header"><div><h2>Order queue</h2><span>{props.orders.length} visible</span></div><button className="refresh-button" onClick={props.onRefresh} disabled={props.isRefreshing}><RefreshCw size={16} className={props.isRefreshing ? "spinning" : ""} />{props.isRefreshing ? "Refreshing" : "Refresh"}</button></div>
            <div className="filter-row">
              <label className="portal-search"><Search size={17} /><input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="Search order or customer" aria-label="Search orders" /></label>
              <div className="status-tabs" aria-label="Order status filters">{statusOptions.map((option) => <button key={option.value} className={props.statusFilter === option.value ? "active" : ""} onClick={() => props.onStatusChange(option.value)}>{option.label}</button>)}</div>
              <label className="fulfillment-filter"><SlidersHorizontal size={16} /><select value={props.fulfillmentFilter} onChange={(event) => props.onFulfillmentChange(event.target.value as FulfillmentFilter)}><option value="ALL">All types</option><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option></select><ChevronDown size={14} /></label>
            </div>
            <OrdersTable orders={props.orders} branches={props.data.branches} onSelect={setSelectedOrder} />
            <div className="orders-panel-footer"><span><Wifi size={14} />Realtime channel connected</span><span>Updated moments ago</span></div>
          </section>
        </main>
      </div>
      {selectedOrder && <><div className="quick-view-scrim" onClick={() => setSelectedOrder(null)} /><OrderQuickView businessId={props.businessId} order={selectedOrder} capabilities={props.data.user.capabilities} onClose={() => setSelectedOrder(null)} onCommand={props.onCommand} /></>}
    </div>
  );
}
