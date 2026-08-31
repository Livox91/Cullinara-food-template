"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, Printer } from "lucide-react";
import type { BusinessPortalData } from "@/models/businessPortal";
import { apiRequest } from "@/services/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = Record<string, any>;
const money = (value: unknown) => `Rs. ${Number(value ?? 0).toLocaleString("en-PK")}`;

export function BusinessOrderDetail({ businessId, publicId, data }: { businessId: string; publicId: string; data: BusinessPortalData }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(data.branches.map((branch) => apiRequest<Order>(`businesses/${businessId}/branches/${branch.id}/orders/${publicId}`, { signal: controller.signal }).catch(() => null)))
      .then((rows) => { const found = rows.find(Boolean); if (found) setOrder(found); else setError("Order not found in the branches you can access."); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load this order."));
    return () => controller.abort();
  }, [businessId, data.branches, publicId]);
  if (error) return <><Heading businessId={businessId}/><div className="portal-inline-error">{error}</div></>;
  if (!order) return <div className="portal-loading"><div className="portal-loader"/><p>Loading order…</p></div>;
  // Anyone authorized to read the order can print the same immutable data.
  // This is especially important for the cashier workflow.
  const canPrintBill = data.user.capabilities.includes("order.read");
  return <><Heading businessId={businessId}/><div className="detail-command-bar"><div><span>ORDER #{order.orderNumber ?? order.publicId}</span><h2>{order.customerName}</h2><div><span className={`module-badge badge-${String(order.status).toLowerCase()}`}>{String(order.status).replaceAll("_", " ")}</span><span><Clock3 size={14}/>{new Date(order.placedAt).toLocaleString("en-PK")}</span></div></div>{canPrintBill && <button className="module-button primary" onClick={() => window.print()}><Printer size={16}/> Generate bill</button>}</div>
    <div className="detail-layout"><div><section className="module-panel"><div className="module-panel-heading"><div><h2>Order items</h2><p>Immutable checkout snapshots</p></div></div><div className="order-items">{(order.items ?? []).map((item: Order) => <article key={item.id}><strong>{item.quantity} × {item.itemName} — {item.variantName}</strong><ul>{(item.modifiers ?? []).map((modifier: Order, index: number) => <li key={`${modifier.optionName}-${index}`}>{modifier.optionName}{Number(modifier.unitPriceDelta) ? ` (+${money(modifier.unitPriceDelta)})` : ""}</li>)}</ul>{item.specialInstructions && <p>{item.specialInstructions}</p>}<span>{money(item.total)}</span></article>)}</div>{order.customerNote && <div className="module-notice warning">{order.customerNote}</div>}</section>
      <section className="module-panel"><div className="module-panel-heading"><div><h2>Status timeline</h2><p>Backend-recorded transitions</p></div></div><div className="timeline">{(order.statusHistory ?? []).map((row: Order) => <div key={row.id}><span/><time>{new Date(row.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</time><strong>{String(row.toStatus ?? row.status).replaceAll("_", " ")}</strong><small>{row.actorType}</small></div>)}</div></section></div>
      <aside><section className="module-panel compact"><h2>Customer & fulfillment</h2><dl className="detail-list"><div><dt>Customer</dt><dd>{order.customerName}</dd></div><div><dt>Contact</dt><dd>{order.customerPhone}</dd></div><div><dt>Fulfillment</dt><dd>{order.fulfillmentType}</dd></div><div><dt>Branch</dt><dd>{order.branch?.name}</dd></div></dl></section><section className="module-panel compact"><h2>Authoritative totals</h2><dl className="detail-list"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Discount</dt><dd>-{money(order.discount)}</dd></div><div><dt>Delivery fee</dt><dd>{money(order.deliveryFee)}</dd></div><div><dt>Tax</dt><dd>{money(order.tax)}</dd></div><div className="total"><dt>Total</dt><dd>{money(order.grandTotal)}</dd></div></dl><span className="module-badge">{order.paymentStatus}</span></section></aside></div>{canPrintBill && <BusinessBill order={order}/>}</>;
}

function BusinessBill({ order }: { order: Order }) { return <section className="business-print-bill"><header><h1>{order.branch?.business?.name ?? "Culinara"}</h1><p>{order.branch?.name}</p><strong>ORDER BILL #{order.orderNumber ?? order.publicId}</strong><small>{new Date(order.placedAt).toLocaleString("en-PK")}</small></header><dl><div><dt>Customer</dt><dd>{order.customerName}</dd></div><div><dt>Phone</dt><dd>{order.customerPhone}</dd></div><div><dt>Fulfillment</dt><dd>{String(order.fulfillmentType).replaceAll("_", " ")}</dd></div></dl><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{(order.items ?? []).map((item: Order) => <tr key={item.id}><td><strong>{item.itemName} — {item.variantName}</strong>{(item.modifiers ?? []).map((modifier: Order, index: number) => <small key={`${modifier.optionName}-${index}`}>{modifier.optionName}</small>)}</td><td>{item.quantity}</td><td>{money(item.total)}</td></tr>)}</tbody></table><dl className="bill-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Discount</dt><dd>-{money(order.discount)}</dd></div><div><dt>Delivery fee</dt><dd>{money(order.deliveryFee)}</dd></div><div><dt>Tax & service</dt><dd>{money(Number(order.tax) + Number(order.serviceFee))}</dd></div><div><dt>Total</dt><dd>{money(order.grandTotal)}</dd></div><div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div></dl><footer>Generated from the immutable order snapshot.</footer></section>; }

function Heading({ businessId }: { businessId: string }) { return <div className="portal-page-heading"><div><span className="breadcrumb">Business portal / Order operations</span><h1>Order operations</h1><p>Inspect preparation, payment, delivery, and status history.</p></div><Link className="module-button secondary" href={`/business/${businessId}/orders`}>Back to queue</Link></div>; }
