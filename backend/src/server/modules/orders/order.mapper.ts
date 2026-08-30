export function orderDto(o: any) {
  return {
    publicId: o.publicId,
    orderNumber: o.orderNumber?.toString() ?? null,
    branchId: o.branchId,
    fulfillmentType: o.fulfillmentType,
    status: o.status,
    paymentStatus: o.paymentStatus,
    currency: o.currency,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerNote: o.customerNote,
    scheduledFor: o.scheduledFor?.toISOString() ?? null,
    subtotal: o.subtotalAmount.toString(),
    discount: o.discountAmount.toString(),
    tax: o.taxAmount.toString(),
    deliveryFee: o.deliveryFeeAmount.toString(),
    serviceFee: o.serviceFeeAmount.toString(),
    rounding: o.roundingAmount.toString(),
    grandTotal: o.grandTotalAmount.toString(),
    couponCode: o.couponCodeSnapshot,
    placedAt: o.placedAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString() ?? null,
    completedAt: o.completedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    cancellationReason: o.cancellationReason,
    branch: o.branch
      ? {
          id: o.branch.id,
          name: o.branch.name,
          phone: o.branch.phone,
          addressLine1: o.branch.addressLine1,
          city: o.branch.city,
        }
      : undefined,
    items: o.items?.map((i: any) => ({
      id: i.id,
      itemName: i.itemNameSnapshot,
      variantName: i.variantNameSnapshot,
      sku: i.skuSnapshot,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
      baseSubtotal: i.baseSubtotal.toString(),
      modifierSubtotal: i.modifierSubtotal.toString(),
      total: i.totalAmount.toString(),
      specialInstructions: i.specialInstructions,
      comboComponents: Array.isArray(i.componentSnapshot) ? i.componentSnapshot : [],
      modifiers:
        i.modifiers?.map((m: any) => ({
          groupName: m.groupNameSnapshot,
          optionName: m.optionNameSnapshot,
          quantity: m.quantity,
          unitPriceDelta: m.unitPriceDelta.toString(),
          total: m.totalPrice.toString(),
        })) ?? [],
    })),
    adjustments: o.adjustments?.map((a: any) => ({
      type: a.type,
      amount: a.amount.toString(),
      description: a.description,
    })),
    delivery: o.delivery
      ? {
          ...o.delivery,
          latitude: o.delivery.latitude.toString(),
          longitude: o.delivery.longitude.toString(),
          distanceKm: o.delivery.distanceKm?.toString() ?? null,
        }
      : null,
    payments: o.payments?.map((p: any) => ({
      id: p.id,
      method: p.method,
      provider: p.provider,
      status: p.status,
      amount: p.amount.toString(),
      currency: p.currency,
      createdAt: p.createdAt.toISOString(),
    })),
    statusHistory: o.statusHistory?.map((h: any) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}
export const orderInclude = {
  branch: true,
  items: { include: { modifiers: true } },
  adjustments: true,
  delivery: true,
  payments: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
} as const;
