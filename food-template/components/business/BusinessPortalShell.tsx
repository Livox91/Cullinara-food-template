"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent, Bell, Bike, ChefHat, ChevronDown, CircleGauge, ClipboardList,
  CreditCard, LayoutDashboard, Menu, MessageSquareText, Package, ScrollText,
  Settings, Store, Users, Utensils, X,
} from "lucide-react";
import type { BusinessPageKind, BusinessPortalData } from "@/models/businessPortal";
import { notifyCustomerSessionChanged } from "@/lib/customerSession";

const nav: Array<{ label: string; page: BusinessPageKind; path: string; icon: LucideIcon; capability: string }> = [
  { label: "Dashboard", page: "dashboard", path: "", icon: LayoutDashboard, capability: "dashboard.read" },
  { label: "Live orders", page: "order-detail", path: "/orders", icon: ClipboardList, capability: "order.read" },
  { label: "Kitchen", page: "kitchen", path: "/kitchen", icon: ChefHat, capability: "kitchen.read" },
  { label: "Menu", page: "menu", path: "/menu", icon: Utensils, capability: "menu.manage" },
  { label: "Branches", page: "branches", path: "/branches", icon: Store, capability: "branch.manage" },
  { label: "Inventory", page: "inventory", path: "/inventory", icon: Package, capability: "inventory.manage" },
  { label: "Coupons", page: "coupons", path: "/coupons", icon: BadgePercent, capability: "coupon.manage" },
  { label: "Payments", page: "payments", path: "/payments", icon: CreditCard, capability: "payment.manage" },
  { label: "Dispatch", page: "dispatch", path: "/dispatch", icon: Bike, capability: "dispatch.read" },
  { label: "Reviews", page: "reviews", path: "/reviews", icon: MessageSquareText, capability: "review.read" },
  { label: "Team", page: "team", path: "/team", icon: Users, capability: "member.manage" },
  { label: "Audit log", page: "audit", path: "/audit", icon: ScrollText, capability: "audit.read" },
  { label: "Settings", page: "settings", path: "/settings", icon: Settings, capability: "business.manage" },
];

interface Props {
  businessId: string;
  activePage: BusinessPageKind;
  data: BusinessPortalData;
  children: React.ReactNode;
}

export function BusinessPortalShell({ businessId, activePage, data, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchId, setBranchId] = useState(searchParams.get("branch") ?? "all");
  const currentBranch = data.branches.find((branch) => branch.id === branchId);
  const accepting = branchId === "all" ? data.branches.filter((branch) => branch.acceptingOrders).length : currentBranch?.acceptingOrders ? 1 : 0;

  return (
    <div className="business-portal" data-business-id={businessId}>
      <button className={`portal-scrim ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      <aside className={`business-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="portal-brand"><span className="portal-brand-mark"><Utensils size={20} /></span><span>Culinara <small>OPERATIONS</small></span><button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
        <nav aria-label="Business portal navigation">
          <p className="nav-caption">Workspace</p>
          {nav.filter((item) => data.user.capabilities.includes(item.capability)).map((item) => {
            const active = item.page === activePage || (activePage === "order-detail" && item.path === "/orders") || (["branch-detail", "hours", "branch-menu"].includes(activePage) && item.page === "branches") || (activePage === "inventory-history" && item.page === "inventory") || (activePage === "menu-item" && item.page === "menu");
            const path = item.page === "inventory" ? (data.branches[0] ? `/branches/${data.branches[0].id}/inventory` : "/branches") : item.path;
            return <Link key={item.label} className={`portal-nav-item ${active ? "active" : ""}`} href={`/business/${businessId}${path}`} onClick={() => setMobileOpen(false)}><item.icon size={18} /><span>{item.label}</span>{item.path === "/orders" && <span className="nav-live-dot" aria-label="Live" />}</Link>;
          })}
        </nav>
        <div className="sidebar-support"><CircleGauge size={20} /><div><strong>Service health</strong><span>All systems operational</span></div><span className="health-dot" /></div>
      </aside>
      <div className="portal-workspace">
        <header className="business-topbar">
          <button className="mobile-nav-trigger" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <label className="business-switcher"><span>Business</span><strong>{data.business.name}</strong><ChevronDown size={15} /></label>
          <span className="topbar-divider" />
          <label className="branch-switcher"><span>Branch</span><select value={branchId} onChange={(event) => { const next = event.target.value; setBranchId(next); const query = new URLSearchParams(searchParams.toString()); if (next === "all") query.delete("branch"); else query.set("branch", next); router.replace(`${pathname}${query.size ? `?${query}` : ""}`); }}><option value="all">All branches</option>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} · {branch.city}</option>)}</select><ChevronDown size={15} /></label>
          <div className="topbar-spacer" />
          <div className={`acceptance-pill ${accepting ? "accepting" : "paused"}`}><span />{branchId === "all" ? `${accepting} of ${data.branches.length} accepting` : accepting ? "Accepting orders" : "Orders paused"}</div>
          <Link className="notification-button" href={`/business/${businessId}/notifications`} aria-label="Notifications"><Bell size={19} /><span>{data.notifications.filter((item) => !item.read).length}</span></Link>
          <button className="user-menu" title="Sign out" onClick={async () => { await fetch("/api/session/logout", { method: "POST" }); notifyCustomerSessionChanged(); router.replace("/business/login"); router.refresh(); }}><span className="avatar">{data.user.initials}</span><span><strong>{data.user.name}</strong><small>{data.user.role} · Sign out</small></span><ChevronDown size={15} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}
