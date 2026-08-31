"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Bell,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  History,
  MapPin,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
} from "lucide-react";
import type {
  BusinessPageKind,
  BusinessPortalData,
  InventoryRecord,
} from "@/models/businessPortal";
import { BusinessPortalShell } from "@/components/business/BusinessPortalShell";
import { BusinessDataActions } from "@/components/business/BusinessDataActions";
import { BusinessOrderDetail } from "@/components/business/BusinessOrderDetail";
import { apiRequest } from "@/services/apiClient";

interface Props {
  businessId: string;
  page: BusinessPageKind;
  entityId?: string;
  data: BusinessPortalData;
  onDataChanged: () => void;
}

const money = (value: number) => `Rs. ${value.toLocaleString("en-PK")}`;
const titleMap: Record<BusinessPageKind, [string, string]> = {
  dashboard: [
    "Operations dashboard",
    "A live view of today’s service across every branch.",
  ],
  "order-detail": [
    "Order operations",
    "Inspect preparation, payment, delivery, and status history.",
  ],
  kitchen: [
    "Kitchen display",
    "Preparation-first tickets for the active branch.",
  ],
  branches: [
    "Branches",
    "Manage locations, service state, and local operations.",
  ],
  "branch-detail": [
    "Branch overview",
    "Review location identity and operational settings.",
  ],
  hours: [
    "Operating hours",
    "Set the weekly schedule and date-specific exceptions.",
  ],
  menu: [
    "Menu management",
    "Manage the global catalog, variants, and availability.",
  ],
  "menu-item": [
    "Menu item editor",
    "Edit catalog details without confusing branch overrides.",
  ],
  modifiers: [
    "Modifier groups",
    "Manage selection rules and reusable customization options.",
  ],
  "branch-menu": [
    "Branch menu",
    "Control local price and availability overrides.",
  ],
  inventory: [
    "Inventory",
    "Monitor stock through ledger-backed operational workflows.",
  ],
  "inventory-history": [
    "Inventory history",
    "Trace purchases, reservations, waste, and adjustments.",
  ],
  coupons: [
    "Coupons & promotions",
    "Create and monitor clear, bounded discount rules.",
  ],
  payments: [
    "Payments",
    "Investigate payment state and eligible refunds safely.",
  ],
  dispatch: [
    "Dispatch monitor",
    "Track delivery execution without rider-only controls.",
  ],
  reviews: [
    "Customer reviews",
    "Understand customer feedback across branches.",
  ],
  team: ["Team & access", "Manage staff roles and branch permissions."],
  audit: [
    "Audit log",
    "Read-only traceability for sensitive operational changes.",
  ],
  settings: [
    "Business settings",
    "Manage profile and supported operating preferences.",
  ],
  notifications: ["Notifications", "Operational events that need attention."],
};

function Header({
  page,
  action,
}: {
  page: BusinessPageKind;
  action?: React.ReactNode;
}) {
  const [title, description] = titleMap[page];
  return (
    <div className="portal-page-heading">
      <div>
        <span className="breadcrumb">Business portal / {title}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Button({
  children,
  tone = "secondary",
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`module-button ${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Badge({ value }: { value: string }) {
  const slug = value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return (
    <span className={`module-badge badge-${slug}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Toolbar({
  query,
  setQuery,
  children,
}: {
  query: string;
  setQuery: (value: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="module-toolbar">
      <label className="portal-search">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this page"
        />
      </label>
      {children}
    </div>
  );
}

function Notice({
  children,
  kind = "info",
}: {
  children: React.ReactNode;
  kind?: "info" | "warning" | "success";
}) {
  return (
    <div className={`module-notice ${kind}`}>
      {kind === "warning" ? (
        <AlertTriangle size={17} />
      ) : kind === "success" ? (
        <CheckCircle2 size={17} />
      ) : (
        <ShieldCheck size={17} />
      )}
      <span>{children}</span>
    </div>
  );
}

function DemoAction({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: "primary" | "secondary" | "danger";
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="demo-action">
      <Button
        tone={tone}
        onClick={() => {
          const panel = document.querySelector(".data-action");
          if (panel)
            panel.scrollIntoView({ behavior: "smooth", block: "center" });
          else
            setMessage(
              "This action is not exposed by the current backend API.",
            );
        }}
      >
        {label}
      </Button>
      {message && <span>{message}</span>}
    </div>
  );
}

function Dashboard({
  data,
  businessId,
}: {
  data: BusinessPortalData;
  businessId: string;
}) {
  const d = data.dashboard;
  const cards = [
    ["Orders today", d.ordersToday, "Across all branches", Utensils, "blue"],
    [
      "Revenue today",
      money(d.revenueToday),
      "Server reporting snapshot",
      TrendingUp,
      "green",
    ],
    ["Preparing", d.preparing, "In active kitchens", ChefHat, "amber"],
    [
      "Active deliveries",
      d.activeDeliveries,
      "Rider execution in progress",
      Bike,
      "purple",
    ],
  ] as const;
  return (
    <>
      <Header
        page="dashboard"
        action={
          <div className="live-sync">
            <RefreshCw size={15} />
            <span>Live overview</span>
            <small>Updated moments ago</small>
          </div>
        }
      />
      <section className="metric-grid">
        {cards.map(([label, value, detail, Icon, tone]) => (
          <article className="metric-card" key={label}>
            <span className={`metric-icon ${tone}`}>
              <Icon size={19} />
            </span>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="module-panel">
          <div className="module-panel-heading">
            <div>
              <h2>Needs attention</h2>
              <p>Operational work ordered by urgency</p>
            </div>
          </div>
          <div className="attention-list">
            <Link href={`/business/${businessId}/orders`}>
              <span className="attention-icon red">
                <Bell size={18} />
              </span>
              <div>
                <strong>
                  {d.awaitingConfirmation} orders awaiting confirmation
                </strong>
                <small>Oldest has waited 14 minutes</small>
              </div>
              <ChevronRight size={18} />
            </Link>
            <Link href={`/business/${businessId}/dispatch`}>
              <span className="attention-icon amber">
                <Bike size={18} />
              </span>
              <div>
                <strong>{d.ready} orders ready for rider</strong>
                <small>Assignment required</small>
              </div>
              <ChevronRight size={18} />
            </Link>
            <Link href={`/business/${businessId}/branches/f7/inventory`}>
              <span className="attention-icon purple">
                <Package size={18} />
              </span>
              <div>
                <strong>{d.lowStock} low-stock ingredients</strong>
                <small>One item is below safety stock</small>
              </div>
              <ChevronRight size={18} />
            </Link>
            <Link href={`/business/${businessId}/payments`}>
              <span className="attention-icon blue">
                <CreditCard size={18} />
              </span>
              <div>
                <strong>{d.paymentReview} payment requiring review</strong>
                <small>Provider response failed</small>
              </div>
              <ChevronRight size={18} />
            </Link>
          </div>
        </section>
        <section className="module-panel">
          <div className="module-panel-heading">
            <div>
              <h2>Orders by service hour</h2>
              <p>Today · Asia/Karachi</p>
            </div>
          </div>
          <div className="mini-bars">
            {d.hourlyOrders.map((value, index) => (
              <div key={index}>
                <span style={{ height: `${Math.max(18, value * 2)}px` }} />
                <small>{index + 11}:00</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="module-panel branch-health">
        <div className="module-panel-heading">
          <div>
            <h2>Branch health</h2>
            <p>Open state and order acceptance</p>
          </div>
          <Link href={`/business/${businessId}/branches`}>
            Manage branches <ArrowRight size={14} />
          </Link>
        </div>
        <div className="branch-health-grid">
          {data.branches.map((branch) => (
            <article key={branch.id}>
              <div>
                <Store size={18} />
                <strong>{branch.name}</strong>
              </div>
              <span>
                {branch.city} · {branch.code}
              </span>
              <div>
                <Badge value={branch.openNow ? "Open now" : "Closed"} />
                <Badge
                  value={branch.acceptingOrders ? "Accepting" : "Paused"}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Kitchen({
  data,
  businessId,
  onDataChanged,
}: {
  data: BusinessPortalData;
  businessId: string;
  onDataChanged: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const canPrepare = data.user.capabilities.includes("order.prepare");
  async function advance(ticket: BusinessPortalData["kitchen"][number]) {
    const command = ticket.status === "CONFIRMED" ? "start-preparing" : "ready";
    setPendingId(ticket.id);
    setError("");
    try {
      await apiRequest(
        `businesses/${businessId}/branches/${ticket.branchId}/orders/${ticket.id}/${command}`,
        { method: "POST" },
      );
      onDataChanged();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The kitchen status could not be updated.",
      );
    } finally {
      setPendingId("");
    }
  }
  return (
    <div className={fullscreen ? "kitchen-fullscreen" : ""}>
      <Header
        page="kitchen"
        action={
          <Button onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? "Exit fullscreen" : "Fullscreen mode"}
          </Button>
        }
      />
      <Notice>
        Live preparation queue · Customer and financial details are
        intentionally hidden.
      </Notice>
      {error && (
        <div className="portal-inline-error" role="alert">
          {error}
        </div>
      )}
      <div className="kitchen-board">
        {data.kitchen.map((ticket) => (
          <article
            className={`kitchen-ticket ${ticket.ageMinutes >= 20 ? "urgent" : ""}`}
            key={ticket.id}
          >
            <header>
              <div>
                <span>#{ticket.orderNumber}</span>
                <small>{ticket.fulfillment}</small>
              </div>
              <div>
                <Badge value={ticket.status} />
                <strong>
                  <Clock3 size={15} />
                  {ticket.ageMinutes} min
                </strong>
              </div>
            </header>
            <div className="kitchen-items">
              {ticket.items.map((item) => (
                <div key={item.name}>
                  <strong>
                    {item.quantity} × {item.name}
                  </strong>
                  {item.modifiers.map((modifier) => (
                    <span key={modifier}>+ {modifier}</span>
                  ))}
                </div>
              ))}
            </div>
            {ticket.note && (
              <div className="ticket-note">
                <AlertTriangle size={15} />
                {ticket.note}
              </div>
            )}
            {canPrepare && (
              <Button
                tone="primary"
                disabled={Boolean(pendingId)}
                onClick={() => void advance(ticket)}
              >
                {pendingId === ticket.id
                  ? "Updating…"
                  : ticket.status === "CONFIRMED"
                    ? "Start preparing"
                    : "Mark ready"}
              </Button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Branches({
  data,
  businessId,
}: {
  data: BusinessPortalData;
  businessId: string;
}) {
  const [query, setQuery] = useState("");
  const branches = data.branches.filter((branch) =>
    branch.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Header page="branches" />
      <section className="module-panel">
        <Toolbar query={query} setQuery={setQuery} />
        <div className="branch-card-grid">
          {branches.map((branch) => (
            <article key={branch.id}>
              <div className="branch-card-head">
                <span>
                  <Store size={20} />
                </span>
                <div>
                  <h3>{branch.name}</h3>
                  <p>
                    {branch.code} · {branch.city}
                  </p>
                </div>
                <Badge value={branch.active ? "Active" : "Inactive"} />
              </div>
              <p className="branch-address">
                <MapPin size={15} />
                {branch.address}
              </p>
              <div className="branch-state">
                <Badge value={branch.openNow ? "Open now" : "Closed"} />
                <Badge
                  value={branch.acceptingOrders ? "Accepting" : "Paused"}
                />
                <span>{branch.fulfillment.join(" + ")}</span>
              </div>
              <div className="card-links">
                <Link href={`/business/${businessId}/branches/${branch.id}`}>
                  Overview
                </Link>
                <Link
                  href={`/business/${businessId}/branches/${branch.id}/hours`}
                >
                  Hours
                </Link>
                <Link
                  href={`/business/${businessId}/branches/${branch.id}/menu`}
                >
                  Menu
                </Link>
                <Link
                  href={`/business/${businessId}/branches/${branch.id}/inventory`}
                >
                  Inventory
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function BranchDetail({
  data,
  businessId,
  entityId,
}: {
  data: BusinessPortalData;
  businessId: string;
  entityId?: string;
}) {
  const branch =
    data.branches.find((item) => item.id === entityId) ?? data.branches[0];
  if (!branch)
    return (
      <>
        <Header page="branch-detail" />
        <Notice kind="warning">
          Create a branch before opening branch settings.
        </Notice>
      </>
    );
  return (
    <>
      <Header page="branch-detail" />
      <div className="module-tabs">
        <span className="active">Overview</span>
        <Link href={`/business/${businessId}/branches/${branch.id}/hours`}>
          Operating hours
        </Link>
        <Link href={`/business/${businessId}/branches/${branch.id}/menu`}>
          Menu availability
        </Link>
        <Link href={`/business/${businessId}/branches/${branch.id}/inventory`}>
          Inventory
        </Link>
      </div>
      <div className="detail-layout">
        <section className="module-panel">
          <div className="entity-hero">
            <span>
              <Store size={28} />
            </span>
            <div>
              <h2>{branch.name}</h2>
              <p>{branch.address}</p>
              <div>
                <Badge value={branch.active ? "Active" : "Inactive"} />
                <Badge value={branch.openNow ? "Open now" : "Closed"} />
              </div>
            </div>
          </div>
          <dl className="detail-list two-column">
            <div>
              <dt>Branch code</dt>
              <dd>{branch.code}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{branch.city}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{branch.phone}</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd>{branch.fulfillment.join(", ")}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{data.business.timezone}</dd>
            </div>
            <div>
              <dt>Order acceptance</dt>
              <dd>{branch.acceptingOrders ? "Accepting orders" : "Paused"}</dd>
            </div>
          </dl>
        </section>
        <aside>
          <section className="module-panel compact">
            <h2>Operational controls</h2>
            <Notice kind={branch.acceptingOrders ? "success" : "warning"}>
              {branch.acceptingOrders
                ? "Customers can place new orders."
                : "New orders are currently paused."}
            </Notice>
          </section>
        </aside>
      </div>
    </>
  );
}

function Hours({
  data,
  entityId,
}: {
  data: BusinessPortalData;
  entityId?: string;
}) {
  const branch =
    data.branches.find((item) => item.id === entityId) ?? data.branches[0];
  if (!branch)
    return (
      <>
        <Header page="hours" />
        <Notice kind="warning">
          Create a branch before configuring operating hours.
        </Notice>
      </>
    );
  return (
    <>
      <Header page="hours" />
      <Notice>
        Editing {branch.name} · Times are interpreted in{" "}
        {data.business.timezone}. Closing times after midnight are treated as
        overnight.
      </Notice>
      {data.specialHours.length > 0 && (
        <section className="module-panel">
          <div className="module-panel-heading"><div><h2>Current exceptions</h2><p>Date-specific hours already saved for this branch</p></div></div>
          <div className="special-hours">
            {data.specialHours.map((row) => <article key={`${row.date}-${row.label}`}><div><strong>{row.date}</strong><small>{row.label}</small></div><span>{row.hours}</span></article>)}
          </div>
        </section>
      )}
    </>
  );
}

function MenuManagement({
  data,
  businessId,
}: {
  data: BusinessPortalData;
  businessId: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [state, setState] = useState("All");
  const categories = [
    "All",
    ...Array.from(new Set(data.menu.map((item) => item.category))),
  ];
  const items = data.menu.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      (state === "All" || (state === "Active" ? item.active : !item.active)) &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Header
        page="menu"
        action={
          <div className="header-actions">
            <Link
              className="module-button secondary"
              href={`/business/${businessId}/menu/modifiers`}
            >
              Modifier groups
            </Link>
          </div>
        }
      />
      <Notice>
        The catalog defines products globally. Deals and combos use a fixed
        bundle price and stay available only while every included item is
        available.
      </Notice>
      <div className="catalog-layout">
        <aside className="module-panel category-list">
          <div>
            <h2>Categories</h2>
          </div>
          {categories.map((item) => (
            <button
              className={item === category ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
            >
              <span>{item}</span>
              <small>
                {item === "All"
                  ? data.menu.length
                  : data.menu.filter((menuItem) => menuItem.category === item)
                      .length}
              </small>
            </button>
          ))}
        </aside>
        <section className="module-panel">
          <Toolbar query={query} setQuery={setQuery}>
            <select className="module-select" value={state} onChange={(event) => setState(event.target.value)}>
              <option value="All">All states</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Toolbar>
          <div className="catalog-list">
            {items.map((item) => (
              <article key={item.id}>
                <span
                  className={`catalog-thumb ${item.itemType !== "STANDARD" ? "bundle" : ""}`}
                >
                  <Utensils size={20} />
                </span>
                <div>
                  <h3>
                    {item.name}{" "}
                    {item.itemType !== "STANDARD" && (
                      <Badge value={item.itemType} />
                    )}
                  </h3>
                  <p>
                    {item.category} ·{" "}
                    {item.itemType === "STANDARD"
                      ? `${item.variants.length} ${item.variants.length === 1 ? "variant" : "variants"}`
                      : item.comboComponents
                          .map(
                            (component) =>
                              `${component.quantity}× ${component.itemName}`,
                          )
                          .join(" · ")}
                  </p>
                </div>
                <strong>
                  {money(item.variants[0]?.price ?? 0)}
                  {item.itemType === "STANDARD" ? "+" : ""}
                </strong>
                <Badge value={item.active ? "Active" : "Inactive"} />
                <span>
                  {item.availableBranches}/{item.branchCount} branches
                </span>
                <Link href={`/business/${businessId}/menu/items/${item.id}`}>
                  Edit <ChevronRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function MenuItemEditor({
  data,
  businessId,
  entityId,
}: {
  data: BusinessPortalData;
  businessId: string;
  entityId?: string;
}) {
  const item = data.menu.find((menuItem) => menuItem.id === entityId);
  if (!item)
    return (
      <>
        <Header page="menu-item" />
        <Notice kind="warning">
          This menu item no longer exists. Return to the menu and choose an
          existing item.
        </Notice>
        <Link className="module-button secondary" href={`/business/${businessId}/menu`}>
          Back to menu
        </Link>
      </>
    );
  return (
    <>
      <Header
        page="menu-item"
        action={
          <Link className="module-button secondary" href={`/business/${businessId}/menu`}>
            Back to menu
          </Link>
        }
      />
      <Notice>Edit the item and add variants with the connected forms below.</Notice>
    </>
  );
}

function Modifiers({ data }: { data: BusinessPortalData }) {
  return (
    <>
      <Header
        page="modifiers"
        action={<DemoAction label="Create modifier group" />}
      />
      <Notice kind="warning">
        Changing a shared modifier can affect many menu items. Review usage
        before saving.
      </Notice>
      <div className="modifier-grid">
        {data.modifiers.map((group) => (
          <article className="module-panel" key={group.id}>
            <div className="module-panel-heading">
              <div>
                <h2>{group.name}</h2>
                <p>{group.rule}</p>
              </div>
              <Button>
                <Pencil size={14} /> Edit
              </Button>
            </div>
            <div className="modifier-options">
              {group.options.map((option) => (
                <div key={option.name}>
                  <span>
                    <Check size={14} />
                    {option.name}
                  </span>
                  <strong>
                    {option.priceDelta
                      ? `+${money(option.priceDelta)}`
                      : "Included"}
                  </strong>
                </div>
              ))}
            </div>
            <footer>
              Used by <strong>{group.usedBy} menu items</strong>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}

function BranchMenu({
  data,
  entityId,
}: {
  data: BusinessPortalData;
  entityId?: string;
}) {
  const branch =
    data.branches.find((item) => item.id === entityId) ?? data.branches[0];
  if (!branch)
    return (
      <>
        <Header page="branch-menu" />
        <Notice kind="warning">
          Create a branch before configuring local menu overrides.
        </Notice>
      </>
    );
  return (
    <>
      <Header
        page="branch-menu"
      />
      <Notice>
        Editing local overrides for {branch.name}. Global catalog definitions
        remain unchanged.
      </Notice>
    </>
  );
}

function stockState(item: InventoryRecord) {
  const available = item.onHand - item.reserved;
  return available <= 0
    ? "Out of stock"
    : available <= item.reorderLevel
      ? "Low stock"
      : "Healthy";
}
function Inventory({
  data,
  businessId,
  entityId,
}: {
  data: BusinessPortalData;
  businessId: string;
  entityId?: string;
}) {
  const [query, setQuery] = useState("");
  const branch =
    data.branches.find((item) => item.id === entityId) ?? data.branches[0];
  if (!branch)
    return (
      <>
        <Header page="inventory" />
        <Notice kind="warning">
          Create a branch before recording inventory.
        </Notice>
      </>
    );
  const items = data.inventory.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Header page="inventory" />
      <Notice>
        Inventory for {branch.name}. Quantities change through ledger movements,
        never direct balance edits.
      </Notice>
      <section className="module-panel">
        <Toolbar query={query} setQuery={setQuery}>
          <select className="module-select">
            <option>All stock states</option>
            <option>Low stock</option>
            <option>Out of stock</option>
          </select>
          <Link
            className="module-button secondary"
            href={`/business/${businessId}/branches/${branch.id}/inventory/history`}
          >
            <History size={14} /> Movement history
          </Link>
        </Toolbar>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Reorder at</th>
                <th>State</th>
                <th>Last movement</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>
                      {item.sku} · {item.unit}
                    </small>
                  </td>
                  <td>{item.onHand}</td>
                  <td>{item.reserved}</td>
                  <td>
                    <strong>{item.onHand - item.reserved}</strong>
                  </td>
                  <td>{item.reorderLevel}</td>
                  <td>
                    <Badge value={stockState(item)} />
                  </td>
                  <td>{item.lastMovement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function InventoryHistory({ data }: { data: BusinessPortalData }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const rows = data.inventoryMovements.filter((row) =>
    (type === "All" || row.type.toLowerCase().includes(type.toLowerCase())) &&
    [row.ingredient, row.reference, row.actor].some((value) => value.toLowerCase().includes(query.toLowerCase())),
  );
  return (
    <>
      <Header
        page="inventory-history"
        action={
          <Button>
            <Download size={14} /> Export CSV
          </Button>
        }
      />
      <section className="module-panel">
        <Toolbar query={query} setQuery={setQuery}>
          <select className="module-select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="All">All movement types</option>
            <option value="Purchase">Purchase</option>
            <option value="Waste">Waste</option>
            <option value="Reservation">Reservation</option>
          </select>
        </Toolbar>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Ingredient</th>
                <th>Movement</th>
                <th>Change</th>
                <th>Reference</th>
                <th>Actor</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.time}</td>
                  <td>
                    <strong>{row.ingredient}</strong>
                  </td>
                  <td>
                    <Badge value={row.type} />
                  </td>
                  <td>
                    <strong
                      className={row.change > 0 ? "positive" : "negative"}
                    >
                      {row.change > 0 ? "+" : ""}
                      {row.change}
                    </strong>
                  </td>
                  <td>{row.reference}</td>
                  <td>{row.actor}</td>
                  <td>{row.result}</td>
                </tr>
              ))}
              {!data.inventoryMovements.length && (
                <tr>
                  <td colSpan={7}>No inventory movements recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Coupons({ data, businessId, onDataChanged }: { data: BusinessPortalData; businessId: string; onDataChanged: () => void }) {
  const [deletingId, setDeletingId] = useState<string>();
  const [message, setMessage] = useState("");
  async function deleteCoupon(id: string, code: string) {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    setDeletingId(id); setMessage("");
    try { await apiRequest(`businesses/${businessId}/coupons/${id}`, { method: "DELETE" }); onDataChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Coupon could not be deleted."); }
    finally { setDeletingId(undefined); }
  }
  return (
    <>
      <Header page="coupons" />
      {message && <Notice kind="warning">{message}</Notice>}
      <div className="coupon-grid">
        {data.coupons.map((coupon) => (
          <article className="module-panel coupon-card" key={coupon.id}>
            <header>
              <span className="coupon-code">
                <BadgePercent size={17} />
                {coupon.code}
              </span>
              <Badge value={coupon.active ? "Active" : "Inactive"} />
            </header>
            <h2>{coupon.summary}</h2>
            <dl className="detail-list">
              <div>
                <dt>Schedule</dt>
                <dd>{coupon.period}</dd>
              </div>
              <div>
                <dt>Usage</dt>
                <dd>{coupon.usage}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{coupon.branches}</dd>
              </div>
            </dl>
            <footer>
              <Button tone="danger" disabled={deletingId === coupon.id} onClick={() => void deleteCoupon(coupon.id, coupon.code)}>
                {deletingId === coupon.id ? "Deleting…" : "Delete coupon"}
              </Button>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}

function Payments({
  data,
  businessId,
  onDataChanged,
}: {
  data: BusinessPortalData;
  businessId: string;
  onDataChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(data.payments[0]?.id);
  const [acceptingId, setAcceptingId] = useState<string>();
  const [actionMessage, setActionMessage] = useState("");
  const selected =
    data.payments.find((payment) => payment.id === selectedId) ??
    data.payments[0];
  const rows = data.payments.filter(
    (item) =>
      item.orderNumber.includes(query) ||
      item.customer.toLowerCase().includes(query.toLowerCase()),
  ).filter((item) => status === "All" || item.status.toLowerCase().includes(status.toLowerCase()) || (status === "Paid" && item.status === "CAPTURED"));
  const canAcceptCash = (payment: BusinessPortalData["payments"][number]) =>
    payment.method === "CASH_ON_DELIVERY" &&
    ["PENDING", "AUTHORIZED"].includes(payment.status);
  const acceptCash = async (
    payment: BusinessPortalData["payments"][number],
  ) => {
    setAcceptingId(payment.id);
    setActionMessage("");
    try {
      await apiRequest(
        `businesses/${businessId}/orders/${payment.orderPublicId}/payments/${payment.id}/accept-cash`,
        { method: "POST" },
      );
      setActionMessage("Payment accepted successfully.");
      onDataChanged();
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be accepted.",
      );
    } finally {
      setAcceptingId(undefined);
    }
  };
  if (!selected)
    return (
      <>
        <Header page="payments" />
        <Notice>
          No payment records are available yet. They will appear after customers
          place orders.
        </Notice>
      </>
    );
  return (
    <>
      <Header
        page="payments"
        action={
          <Button>
            <Download size={14} /> Export
          </Button>
        }
      />
      {actionMessage && (
        <Notice
          kind={
            actionMessage.startsWith("Payment accepted") ? "success" : "warning"
          }
        >
          {actionMessage}
        </Notice>
      )}
      <section className="module-panel">
        <Toolbar query={query} setQuery={setQuery}>
          <select className="module-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="All">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </Toolbar>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Branch</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr key={payment.id} onClick={() => setSelectedId(payment.id)}>
                  <td>
                    <Link
                      href={`/business/${businessId}/orders/${payment.orderPublicId}`}
                    >
                      #{payment.orderNumber}
                    </Link>
                  </td>
                  <td>{payment.date}</td>
                  <td>{payment.customer}</td>
                  <td>{payment.method}</td>
                  <td>
                    <strong>{money(payment.amount)}</strong>
                    {payment.refunded > 0 && (
                      <small>{money(payment.refunded)} refunded</small>
                    )}
                  </td>
                  <td>{payment.provider}</td>
                  <td>
                    <Badge value={payment.status} />
                  </td>
                  <td>{payment.branch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="selection-drawer">
        <div className="module-panel compact">
          <div className="module-panel-heading">
            <div>
              <h2>Payment #{selected.orderNumber}</h2>
              <p>
                {selected.provider} · {selected.method}
              </p>
            </div>
            <Badge value={selected.status} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Amount</dt>
              <dd>{money(selected.amount)}</dd>
            </div>
            <div>
              <dt>Refunded</dt>
              <dd>{money(selected.refunded)}</dd>
            </div>
            <div>
              <dt>Provider reference</dt>
              <dd>PF-{selected.id.toUpperCase()}-2026</dd>
            </div>
          </dl>
          {canAcceptCash(selected) && (
            <Button
              tone="primary"
              disabled={acceptingId === selected.id}
              onClick={() => acceptCash(selected)}
            >
              <CheckCircle2 size={15} />{" "}
              {acceptingId === selected.id
                ? "Accepting payment…"
                : "Mark payment accepted"}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}

function Dispatch({ data }: { data: BusinessPortalData }) {
  const [selected, setSelected] = useState(data.deliveries[1]);
  if (!selected)
    return (
      <>
        <Header page="dispatch" />
        <Notice>No active deliveries are available.</Notice>
      </>
    );
  return (
    <>
      <Header
        page="dispatch"
        action={
          <div className="live-sync">
            <Bike size={15} />
            <span>Rider updates live</span>
            <small>Monitoring only</small>
          </div>
        }
      />
      <Notice>
        Rider pickup, delivery, and location actions remain in the rider app.
        This page is read-only operational visibility.
      </Notice>
      <div className="dispatch-layout">
        <section className="module-panel delivery-list">
          <div className="module-panel-heading">
            <div>
              <h2>Active deliveries</h2>
              <p>{data.deliveries.length} currently visible</p>
            </div>
          </div>
          {data.deliveries.map((delivery) => (
            <button
              key={delivery.id}
              className={selected.id === delivery.id ? "active" : ""}
              onClick={() => setSelected(delivery)}
            >
              <div>
                <strong>#{delivery.orderNumber}</strong>
                <Badge value={delivery.state} />
              </div>
              <p>
                <MapPin size={14} />
                {delivery.area} · {delivery.branch}
              </p>
              <div>
                <span>{delivery.rider}</span>
                <span>{delivery.elapsed} min</span>
              </div>
            </button>
          ))}
        </section>
        <section className="dispatch-map">
          <div className="map-grid">
            <span className="branch-pin">
              <Store size={18} />
            </span>
            <span className="rider-pin">
              <Bike size={18} />
            </span>
            <span className="destination-pin">
              <MapPin size={18} />
            </span>
          </div>
          <article>
            <div>
              <strong>Order #{selected.orderNumber}</strong>
              <Badge value={selected.state} />
            </div>
            <dl className="detail-list two-column">
              <div>
                <dt>Rider</dt>
                <dd>{selected.rider}</dd>
              </div>
              <div>
                <dt>Rider state</dt>
                <dd>{selected.riderState}</dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>{selected.eta}</dd>
              </div>
              <div>
                <dt>Location update</dt>
                <dd>{selected.locationAge}</dd>
              </div>
            </dl>
          </article>
        </section>
      </div>
    </>
  );
}

function Reviews({ data }: { data: BusinessPortalData }) {
  const [ratingFilter, setRatingFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const reviews = data.reviews.filter((review) =>
    (branchFilter === "All" || review.branch === branchFilter) &&
    (ratingFilter === "All" || (ratingFilter === "1-3" ? review.rating <= 3 : review.rating === Number(ratingFilter))),
  );
  const average = data.reviews.length
    ? (
        data.reviews.reduce((sum, item) => sum + item.rating, 0) /
        data.reviews.length
      ).toFixed(1)
    : "—";
  return (
    <>
      <Header page="reviews" />
      <div className="review-summary">
        <section className="module-panel">
          <strong>{average}</strong>
          <div className="stars">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} size={17} fill="currentColor" />
            ))}
          </div>
          <p>Average from recent verified orders</p>
        </section>
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating}>
            <span>{rating} star</span>
            <div>
              <i
                style={{
                  width: `${data.reviews.filter((item) => item.rating === rating).length * 25}%`,
                }}
              />
            </div>
            <strong>
              {data.reviews.filter((item) => item.rating === rating).length}
            </strong>
          </div>
        ))}
      </div>
      <section className="module-panel">
        <div className="module-toolbar">
          <select className="module-select" value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
            <option value="All">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="1-3">1–3 stars</option>
          </select>
          <select className="module-select" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="All">All branches</option>
            {data.branches.map((branch) => (
              <option key={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <div className="review-list">
          {reviews.map((review) => (
            <article key={review.id}>
              <span className="review-avatar">
                {review.customer.slice(0, 1)}
              </span>
              <div>
                <div>
                  <strong>{review.customer}</strong>
                  <span className="stars">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={13}
                        fill={index < review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </span>
                </div>
                <p>{review.feedback}</p>
                <small>
                  Order #{review.orderNumber} · {review.branch} · {review.date}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Team({ data, businessId, onDataChanged }: { data: BusinessPortalData; businessId: string; onDataChanged: () => void }) {
  const [pendingId, setPendingId] = useState<string>();
  const [message, setMessage] = useState("");
  async function changeRole(memberId: string, role: string) {
    if (!window.confirm(`Change this member's role to ${role.replaceAll("_", " ")}?`)) return;
    setPendingId(memberId); setMessage("");
    try { await apiRequest(`businesses/${businessId}/members/${memberId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }); onDataChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Role could not be changed."); }
    finally { setPendingId(undefined); }
  }
  return (
    <>
      <Header page="team" />
      {message && <Notice kind="warning">{message}</Notice>}
      <section className="metric-grid compact-metrics">
        <article className="metric-card">
          <span className="metric-icon blue">
            <Users size={19} />
          </span>
          <small>Team members</small>
          <strong>{data.members.length}</strong>
          <p>Across all branches</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <ShieldCheck size={19} />
          </span>
          <small>Active accounts</small>
          <strong>
            {data.members.filter((member) => member.status === "Active").length}
          </strong>
          <p>One invitation pending</p>
        </article>
      </section>
      <section className="module-panel">
        <div className="team-list">
          {data.members.map((member) => (
            <article key={member.id}>
              <span className="member-avatar">{member.initials}</span>
              <div>
                <h3>{member.name}</h3>
                <p>{member.contact}</p>
              </div>
              <span>{member.branches.join(", ")}</span>
              <Badge value={member.status} />
              <select aria-label={`Role for ${member.name}`} className="module-select team-role-select" defaultValue={member.role.replaceAll(" ", "_").toUpperCase()} disabled={pendingId === member.id} onChange={(event) => void changeRole(member.id, event.target.value)}>
                <option value="OWNER">Owner</option><option value="ADMIN">Administrator</option><option value="MANAGER">Manager</option><option value="CASHIER">Cashier</option><option value="KITCHEN">Kitchen</option><option value="SUPPORT">Support</option>
              </select>
            </article>
          ))}
        </div>
      </section>
      <Notice kind="warning">
        Granting Business Admin access allows menu, branch, coupon, and
        team-permission changes. Role mutations require explicit confirmation.
      </Notice>
    </>
  );
}

function Audit({ data }: { data: BusinessPortalData }) {
  const [selected, setSelected] = useState(data.audit[0]);
  const [actorFilter, setActorFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const actors = Array.from(new Set(data.audit.map((row) => row.actor)));
  const actions = Array.from(new Set(data.audit.map((row) => row.action)));
  const rows = data.audit.filter((row) =>
    (actorFilter === "All" || row.actor === actorFilter) &&
    (actionFilter === "All" || row.action === actionFilter),
  );
  if (!selected)
    return (
      <>
        <Header page="audit" />
        <Notice>No audit events have been recorded yet.</Notice>
      </>
    );
  return (
    <>
      <Header
        page="audit"
        action={
          <Button>
            <Download size={14} /> Export audit
          </Button>
        }
      />
      <Notice>
        Audit history is immutable and read-only. Times are shown in{" "}
        {data.business.timezone}.
      </Notice>
      <section className="module-panel">
        <div className="module-toolbar">
          <select className="module-select" value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}>
            <option value="All">All actors</option>
            {actors.map((actor) => <option key={actor}>{actor}</option>)}
          </select>
          <select className="module-select" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="All">All actions</option>
            {actions.map((action) => <option key={action}>{action}</option>)}
          </select>
        </div>
        <div className="audit-list">
          {rows.map((row) => (
            <button key={row.id} onClick={() => setSelected(row)}>
              <span className="audit-icon">
                <History size={17} />
              </span>
              <div>
                <strong>{row.action}</strong>
                <p>
                  {row.actor} · {row.entity}
                </p>
              </div>
              <span>{row.change}</span>
              <time>{row.timestamp}</time>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>
      <section className="module-panel audit-detail">
        <div className="module-panel-heading">
          <div>
            <h2>Event detail</h2>
            <p>{selected.reference}</p>
          </div>
          <Badge value="Read only" />
        </div>
        <dl className="detail-list two-column">
          <div>
            <dt>Actor</dt>
            <dd>{selected.actor}</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{selected.timestamp}</dd>
          </div>
          <div>
            <dt>Entity</dt>
            <dd>{selected.entity}</dd>
          </div>
          <div>
            <dt>Branch</dt>
            <dd>{selected.branch}</dd>
          </div>
          <div>
            <dt>Action</dt>
            <dd>{selected.action}</dd>
          </div>
          <div>
            <dt>Change</dt>
            <dd>{selected.change}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

function SettingsPage({ data }: { data: BusinessPortalData }) {
  const [section, setSection] = useState("Profile");
  const sections = [
    "Profile",
    "Operations",
    "Payments",
    "Notifications",
    "Security",
  ];
  return (
    <>
      <Header page="settings" action={<DemoAction label="Save changes" />} />
      <div className="settings-layout">
        <aside className="module-panel settings-nav">
          {sections.map((item) => (
            <button
              key={item}
              className={section === item ? "active" : ""}
              onClick={() => setSection(item)}
            >
              <Settings size={15} />
              {item}
              <ChevronRight size={14} />
            </button>
          ))}
        </aside>
        <section className="module-panel form-panel">
          <div className="module-panel-heading">
            <div>
              <h2>{section}</h2>
              <p>
                Only settings represented by the current business model are
                editable.
              </p>
            </div>
          </div>
          {section === "Profile" ? (
            <>
              <div className="form-grid">
                <label>
                  Business name
                  <input defaultValue={data.business.name} />
                </label>
                <label>
                  Slug
                  <input defaultValue={data.business.slug} />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Support email
                  <input
                    type="email"
                    defaultValue={data.business.supportEmail}
                  />
                </label>
                <label>
                  Support phone
                  <input defaultValue={data.business.supportPhone} />
                </label>
              </div>
              <label>
                Timezone
                <select defaultValue={data.business.timezone}>
                  <option>Asia/Karachi</option>
                </select>
              </label>
            </>
          ) : section === "Operations" ? (
            <>
              <label>
                Default preparation target
                <select defaultValue="20">
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="25">25 minutes</option>
                </select>
              </label>
              <Notice>
                Branch-specific acceptance and hours remain managed on each
                branch page.
              </Notice>
            </>
          ) : (
            <Notice>
              These controls will be enabled when matching persisted backend
              settings are available.
            </Notice>
          )}
        </section>
      </div>
    </>
  );
}

function Notifications({ data }: { data: BusinessPortalData }) {
  const [filter, setFilter] = useState("All");
  const visible = data.notifications.filter(
    (item) =>
      filter === "All" ||
      (filter === "Unread" ? !item.read : item.type === filter.toLowerCase()),
  );
  const icons = {
    order: Bell,
    inventory: Package,
    delivery: Bike,
    payment: CreditCard,
    team: UserPlus,
  };
  return (
    <>
      <Header
        page="notifications"
        action={
          <Button>
            <Check size={14} /> Mark all read
          </Button>
        }
      />
      <div className="module-tabs">
        {[
          "All",
          "Unread",
          "Order",
          "Inventory",
          "Delivery",
          "Payment",
          "Team",
        ].map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="module-panel notification-list">
        {visible.map((item) => {
          const Icon = icons[item.type as keyof typeof icons] ?? Bell;
          return (
            <article className={item.read ? "read" : ""} key={item.id}>
              <span className={`notification-kind ${item.type}`}>
                <Icon size={18} />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <small>{item.time}</small>
              </div>
              {!item.read && <span className="unread-dot" />}
            </article>
          );
        })}
      </section>
    </>
  );
}

export function BusinessModuleView({
  businessId,
  page,
  entityId,
  data,
  onDataChanged,
}: Props) {
  const content = useMemo(() => {
    switch (page) {
      case "dashboard":
        return <Dashboard data={data} businessId={businessId} />;
      case "order-detail":
        return (
          <BusinessOrderDetail
            businessId={businessId}
            publicId={entityId ?? ""}
            data={data}
          />
        );
      case "kitchen":
        return (
          <Kitchen
            data={data}
            businessId={businessId}
            onDataChanged={onDataChanged}
          />
        );
      case "branches":
        return <Branches data={data} businessId={businessId} />;
      case "branch-detail":
        return (
          <BranchDetail
            data={data}
            businessId={businessId}
            entityId={entityId}
          />
        );
      case "hours":
        return <Hours data={data} entityId={entityId} />;
      case "menu":
        return <MenuManagement data={data} businessId={businessId} />;
      case "menu-item":
        return (
          <MenuItemEditor
            data={data}
            businessId={businessId}
            entityId={entityId}
          />
        );
      case "modifiers":
        return <Modifiers data={data} />;
      case "branch-menu":
        return <BranchMenu data={data} entityId={entityId} />;
      case "inventory":
        return (
          <Inventory data={data} businessId={businessId} entityId={entityId} />
        );
      case "inventory-history":
        return <InventoryHistory data={data} />;
      case "coupons":
        return <Coupons data={data} businessId={businessId} onDataChanged={onDataChanged} />;
      case "payments":
        return (
          <Payments
            data={data}
            businessId={businessId}
            onDataChanged={onDataChanged}
          />
        );
      case "dispatch":
        return <Dispatch data={data} />;
      case "reviews":
        return <Reviews data={data} />;
      case "team":
        return <Team data={data} businessId={businessId} onDataChanged={onDataChanged} />;
      case "audit":
        return <Audit data={data} />;
      case "settings":
        return <SettingsPage data={data} />;
      case "notifications":
        return <Notifications data={data} />;
    }
  }, [businessId, data, entityId, onDataChanged, page]);
  return (
    <BusinessPortalShell businessId={businessId} activePage={page} data={data}>
      <main className="portal-main module-main">
        {content}
        <BusinessDataActions
          businessId={businessId}
          page={page}
          entityId={entityId}
          data={data}
          onSaved={onDataChanged}
        />
      </main>
    </BusinessPortalShell>
  );
}
