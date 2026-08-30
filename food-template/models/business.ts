export type OrderStatus = "PLACED" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type FulfillmentType = "DELIVERY" | "PICKUP";
export type PaymentState = "PENDING" | "CAPTURED" | "COD";

export interface BusinessBranch {
  id: string;
  name: string;
  city: string;
  isAcceptingOrders: boolean;
}

export interface BusinessOrder {
  id: string;
  orderNumber: string;
  branchId: string;
  customerName: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  paymentState: PaymentState;
  paymentMethod: string;
  itemCount: number;
  total: number;
  ageMinutes: number;
  scheduledFor?: string;
  note?: string;
  riderState?: string;
  items?: Array<{ quantity: number; itemName: string; variantName: string; modifiers: Array<{ optionName: string }> }>;
}

export interface BusinessOperationsData {
  business: { id: string; name: string };
  user: { name: string; role: string; initials: string; capabilities: string[] };
  branches: BusinessBranch[];
  orders: BusinessOrder[];
  averagePrepMinutes: number;
  updatedAt: string;
}
