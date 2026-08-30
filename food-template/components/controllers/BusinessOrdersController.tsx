"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BusinessOperationsData, FulfillmentType, OrderStatus } from "@/models/business";
import { businessPortalService } from "@/services/businessPortalService";
import { BusinessOrdersView } from "@/components/views/BusinessOrdersView";
import { apiRequest } from "@/services/apiClient";

export type StatusFilter = "ACTIVE" | "ALL" | OrderStatus;
export type FulfillmentFilter = "ALL" | FulfillmentType;

export function BusinessOrdersController({ businessId }: { businessId: string }) {
  const [data, setData] = useState<BusinessOperationsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("ALL");
  const [query, setQuery] = useState("");

  const load = useCallback(async (signal?: AbortSignal, quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const operations = await businessPortalService.getOrderOperations(businessId, signal);
      setData(operations);
      setError(null);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Unable to load live orders.");
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    const controller = new AbortController();
    businessPortalService.getOrderOperations(businessId, controller.signal)
      .then((operations) => {
        setData(operations);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load live orders.");
      })
      .finally(() => setIsRefreshing(false));
    const interval = window.setInterval(() => void load(undefined, true), 15_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [businessId, load]);

  const branchOrders = useMemo(() => {
    if (!data) return [];
    return selectedBranchId === "all"
      ? data.orders
      : data.orders.filter((order) => order.branchId === selectedBranchId);
  }, [data, selectedBranchId]);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return branchOrders.filter((order) => {
      const matchesStatus = statusFilter === "ALL"
        || (statusFilter === "ACTIVE" && !["COMPLETED", "CANCELLED", "REJECTED"].includes(order.status))
        || order.status === statusFilter;
      const matchesFulfillment = fulfillmentFilter === "ALL" || order.fulfillmentType === fulfillmentFilter;
      const matchesQuery = !needle || `${order.orderNumber} ${order.customerName}`.toLowerCase().includes(needle);
      return matchesStatus && matchesFulfillment && matchesQuery;
    });
  }, [branchOrders, fulfillmentFilter, query, statusFilter]);

  if (!data && !error) return <div className="portal-loading"><div className="portal-loader" /><p>Opening live operations…</p></div>;
  if (!data && error) return <div className="portal-loading portal-load-error"><h1>Operations are unavailable</h1><p>{error}</p><button onClick={() => void load()}>Try again</button></div>;
  if (!data) return null;

  return (
    <BusinessOrdersView
      businessId={businessId}
      data={data}
      orders={filteredOrders}
      branchOrders={branchOrders}
      selectedBranchId={selectedBranchId}
      statusFilter={statusFilter}
      fulfillmentFilter={fulfillmentFilter}
      query={query}
      isRefreshing={isRefreshing}
      error={error}
      onBranchChange={setSelectedBranchId}
      onStatusChange={setStatusFilter}
      onFulfillmentChange={setFulfillmentFilter}
      onQueryChange={setQuery}
      onRefresh={() => void load()}
      onCommand={async (order, command, reason) => {
        await apiRequest(`businesses/${businessId}/branches/${order.branchId}/orders/${order.id}/${command}`, { method: "POST", ...(reason ? { body: JSON.stringify({ reason }) } : {}) });
        await load();
      }}
    />
  );
}
