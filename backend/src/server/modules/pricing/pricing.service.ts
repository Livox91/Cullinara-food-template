import "server-only";
import { Prisma } from "../../../../generated/prisma/client";
import { AppError } from "@/server/http/errors";

const D = (v: any) => new Prisma.Decimal(v);
const out = (v: Prisma.Decimal) => v.toDecimalPlaces(2).toString();
export type PriceableCart = any;
export async function priceCart(cart: PriceableCart, coupon?: any) {
  let subtotal = D(0);
  const lines = [] as any[];
  for (const line of cart.items) {
    const branchVariant = line.variant.branchVariants[0];
    if (
      !line.variant.isActive ||
      !line.variant.menuItem.isActive ||
      (branchVariant && !branchVariant.isAvailable) ||
      (branchVariant?.soldOutUntil && branchVariant.soldOutUntil > new Date())
    )
      throw new AppError(
        "ITEM_UNAVAILABLE",
        "An item in the cart is no longer available.",
        422,
        { cartItemId: line.id },
      );
    if (line.variant.menuItem.isCombo && (line.variant.menuItem.comboComponents?.length < 2 || line.variant.menuItem.comboComponents.some((component: any) => {
      const override = component.variant.branchVariants?.find((row: any) => row.branchId === cart.branchId);
      return !component.variant.isActive || !component.variant.menuItem.isActive || (override && (!override.isAvailable || (override.soldOutUntil && override.soldOutUntil > new Date())));
    })))
      throw new AppError(
        "COMBO_UNAVAILABLE",
        "An item included in a deal or combo is no longer available.",
        422,
        { cartItemId: line.id },
      );
    for (const link of line.variant.menuItem.modifierGroups) {
      const count = line.modifiers
        .filter((m: any) => m.option.modifierGroupId === link.modifierGroupId)
        .reduce((n: number, m: any) => n + m.quantity, 0);
      if (
        (link.isRequired && count === 0) ||
        count < link.minSelections ||
        count > link.maxSelections
      )
        throw new AppError(
          "INVALID_MODIFIER_SELECTIONS",
          `Selections for ${link.modifierGroup.name} are outside the allowed range.`,
          422,
          { cartItemId: line.id, modifierGroupId: link.modifierGroupId },
        );
    }
    const attached = new Set(
      line.variant.menuItem.modifierGroups.map((x: any) => x.modifierGroupId),
    );
    if (
      line.modifiers.some((m: any) => !attached.has(m.option.modifierGroupId))
    )
      throw new AppError(
        "INVALID_MODIFIERS",
        "A selected modifier is no longer attached to this item.",
        422,
        { cartItemId: line.id },
      );
    const unit = D(branchVariant?.priceOverride ?? line.variant.basePrice);
    let modifierUnit = D(0);
    const modifiers = line.modifiers.map((m: any) => {
      const branch = m.option.branchOptions[0];
      if (!m.option.isActive || (branch && !branch.isAvailable))
        throw new AppError(
          "MODIFIER_UNAVAILABLE",
          "A selected modifier is no longer available.",
          422,
          { optionId: m.optionId },
        );
      const amount = D(branch?.priceOverride ?? m.option.priceDelta).mul(
        m.quantity,
      );
      modifierUnit = modifierUnit.plus(amount);
      return {
        id: m.option.id,
        name: m.option.name,
        quantity: m.quantity,
        unitPriceDelta: out(D(branch?.priceOverride ?? m.option.priceDelta)),
        total: out(amount),
      };
    });
    const total = unit.plus(modifierUnit).mul(line.quantity);
    subtotal = subtotal.plus(total);
    lines.push({
      cartItemId: line.id,
      variantId: line.variantId,
      itemName: line.variant.menuItem.name,
      variantName: line.variant.name,
      quantity: line.quantity,
      unitPrice: out(unit),
      modifierUnit: out(modifierUnit),
      total: out(total),
      modifiers,
    });
  }
  let discount = D(0);
  let appliedCoupon = null;
  if (coupon) {
    discount =
      coupon.discountType === "PERCENT"
        ? subtotal.mul(coupon.discountValue).div(100)
        : D(coupon.discountValue);
    if (coupon.maxDiscount && discount.gt(coupon.maxDiscount))
      discount = D(coupon.maxDiscount);
    if (discount.gt(subtotal)) discount = subtotal;
    appliedCoupon = {
      id: coupon.id,
      code: coupon.code,
      discount: out(discount),
    };
  }
  const tax = D(0),
    deliveryFee = D(0),
    serviceFee = D(0),
    rounding = D(0),
    grandTotal = subtotal
      .minus(discount)
      .plus(tax)
      .plus(deliveryFee)
      .plus(serviceFee)
      .plus(rounding);
  return {
    subtotal: out(subtotal),
    discount: out(discount),
    tax: out(tax),
    deliveryFee: out(deliveryFee),
    serviceFee: out(serviceFee),
    rounding: out(rounding),
    grandTotal: out(grandTotal),
    currency: cart.branch.business.defaultCurrency,
    lines,
    coupon: appliedCoupon,
  };
}
