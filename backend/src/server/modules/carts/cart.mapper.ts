export function cartDto(c: any, quote?: any) {
  return {
    id: c.id,
    branchId: c.branchId,
    addressId: c.addressId,
    fulfillmentType: c.fulfillmentType,
    status: c.status,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    items: c.items.map((i: any) => ({
      id: i.id,
      variantId: i.variantId,
      itemName: i.variant.menuItem.name,
      variantName: i.variant.name,
      quantity: i.quantity,
      specialInstructions: i.specialInstructions,
      comboComponents: (i.variant.menuItem.comboComponents ?? []).map((component: any) => ({
        variantId: component.variantId,
        quantity: component.quantity,
        itemName: component.variant.menuItem.name,
        variantName: component.variant.name,
      })),
      modifiers: i.modifiers.map((m: any) => ({
        optionId: m.optionId,
        name: m.option.name,
        quantity: m.quantity,
      })),
    })),
    ...(quote ? { quote } : {}),
  };
}
