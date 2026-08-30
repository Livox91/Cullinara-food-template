"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CustomerCart, CustomerProfile, StoreBranch } from "@/models/storefront";
import { apiRequest, ApiError, publicApiRequest } from "@/services/apiClient";
import { CUSTOMER_SESSION_CHANGED } from "@/lib/customerSession";

interface StorefrontContextValue {
  branches: StoreBranch[]; branch: StoreBranch | null; setBranch: (branch: StoreBranch) => Promise<void>;
  fulfillment: "DELIVERY" | "PICKUP"; setFulfillment: (value: "DELIVERY" | "PICKUP") => Promise<void>;
  cart: CustomerCart | null; profile: CustomerProfile | null; loading: boolean;
  refreshCart: () => Promise<CustomerCart | null>; refreshProfile: () => Promise<CustomerProfile | null>;
  cartCount: number;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);
const BRANCH_KEY = "culinara_branch";

function nearestBranch(rows: StoreBranch[], latitude: number, longitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const distance = (row: StoreBranch) => {
    const branchLatitude = Number(row.latitude); const branchLongitude = Number(row.longitude);
    const latitudeDelta = radians(branchLatitude - latitude); const longitudeDelta = radians(branchLongitude - longitude);
    const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(branchLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };
  return [...rows].filter((row) => row.isActive).sort((left, right) => distance(left) - distance(right))[0] ?? rows[0] ?? null;
}

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<StoreBranch[]>([]);
  const [branch, setBranchState] = useState<StoreBranch | null>(null);
  const [fulfillment, setFulfillmentState] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [cart, setCart] = useState<CustomerCart | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try { const value = await apiRequest<CustomerProfile>("me", {}, false); setProfile(value); return value; }
    catch (error) { if (error instanceof ApiError && error.status === 401) { setProfile(null); return null; } throw error; }
  }, []);
  const refreshCart = useCallback(async () => {
    if (!branch) return null;
    try { const value = await apiRequest<CustomerCart>(`me/cart?branchId=${branch.id}&fulfillmentType=${fulfillment}`, {}, false); setCart(value); return value; }
    catch (error) { if (error instanceof ApiError && error.status === 401) { setCart(null); return null; } throw error; }
  }, [branch, fulfillment]);

  useEffect(() => {
    let active = true;
    publicApiRequest<StoreBranch[]>("branches").then((rows) => {
      if (!active) return;
      setBranches(rows);
      const saved = window.localStorage.getItem(BRANCH_KEY);
      const explicitBranch = rows.find((row) => row.id === saved);
      if (explicitBranch) { setBranchState(explicitBranch); setLoading(false); return; }
      if (!navigator.geolocation) { setBranchState(rows[0] ?? null); setLoading(false); return; }
      navigator.geolocation.getCurrentPosition(
        (position) => { if (active) { setBranchState(nearestBranch(rows, position.coords.latitude, position.coords.longitude)); setLoading(false); } },
        () => { if (active) { setBranchState(rows[0] ?? null); setLoading(false); } },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    }).catch(() => { if (active) setLoading(false); });
    Promise.resolve().then(() => refreshProfile());
    return () => { active = false; };
  }, [refreshProfile]);
  useEffect(() => { if (branch) Promise.resolve().then(() => refreshCart()); }, [branch, fulfillment, refreshCart]);
  useEffect(() => {
    const synchronizeSession = () => { void refreshProfile(); void refreshCart(); };
    window.addEventListener(CUSTOMER_SESSION_CHANGED, synchronizeSession);
    return () => window.removeEventListener(CUSTOMER_SESSION_CHANGED, synchronizeSession);
  }, [refreshCart, refreshProfile]);

  const selectBranch = useCallback(async (next: StoreBranch) => {
    if (cart?.items.length && branch && branch.id !== next.id && !window.confirm("Changing restaurant will clear the current branch cart from view. Continue?")) return;
    window.localStorage.setItem(BRANCH_KEY, next.id); setBranchState(next); setCart(null);
  }, [branch, cart]);
  const setFulfillment = useCallback(async (next: "DELIVERY" | "PICKUP") => {
    if (cart) setCart(await apiRequest<CustomerCart>("me/cart/fulfillment", { method: "PUT", body: JSON.stringify({ cartId: cart.id, fulfillmentType: next }) }));
    setFulfillmentState(next);
  }, [cart]);
  const value = useMemo(() => ({ branches, branch, setBranch: selectBranch, fulfillment, setFulfillment, cart, profile, loading, refreshCart, refreshProfile, cartCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 }), [branches, branch, fulfillment, cart, profile, loading, refreshCart, refreshProfile, selectBranch, setFulfillment]);
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const value = useContext(StorefrontContext);
  if (!value) throw new Error("useStorefront must be used inside StorefrontProvider");
  return value;
}
