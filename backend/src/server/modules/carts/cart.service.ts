import "server-only";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { AppError, NotFoundError } from "@/server/http/errors";
import { cartDto } from "@/server/modules/carts/cart.mapper";
import {
  cartGraph,
  cartRepository,
} from "@/server/modules/carts/cart.repository";
import type {
  AddCartItemInput,
  UpdateCartItemInput,
} from "@/server/modules/carts/cart.schemas";
import { validateCoupon } from "@/server/modules/coupons/coupon.service";
import { priceCart } from "@/server/modules/pricing/pricing.service";
async function customer(userId: string) {
  const p = await cartRepository.profile(userId);
  if (!p) throw new NotFoundError("Customer profile");
  return p;
}
async function owned(userId: string, cartId: string) {
  const p = await customer(userId);
  const c = await cartRepository.owned(p.id, cartId);
  if (!c) throw new NotFoundError("Cart");
  return { p, c };
}
function validateSelections(
  variant: any,
  selected: { optionId: string; quantity: number }[],
) {
  const unique = new Set(selected.map((x) => x.optionId));
  if (unique.size !== selected.length)
    throw new AppError(
      "INVALID_MODIFIERS",
      "Modifier options cannot be repeated.",
      422,
    );
  const links = variant.menuItem.modifierGroups;
  for (const s of selected) {
    const link = links.find((l: any) =>
      l.modifierGroup.options.some((o: any) => o.id === s.optionId),
    );
    if (!link)
      throw new AppError(
        "INVALID_MODIFIERS",
        "A modifier is not attached to this menu item.",
        422,
        { optionId: s.optionId },
      );
  }
  for (const link of links) {
    const count = selected
      .filter((s) =>
        link.modifierGroup.options.some((o: any) => o.id === s.optionId),
      )
      .reduce((n, s) => n + s.quantity, 0);
    if (
      (link.isRequired && count === 0) ||
      count < link.minSelections ||
      count > link.maxSelections
    )
      throw new AppError(
        "INVALID_MODIFIER_SELECTIONS",
        `Selections for ${link.modifierGroup.name} are outside the allowed range.`,
        422,
      );
  }
}
async function variantFor(branchId: string, variantId: string) {
  const v = await getPrisma().menuItemVariant.findUnique({
    where: { id: variantId },
    include: {
      menuItem: {
        include: {
          comboComponents: {
            include: { variant: { include: { menuItem: true, branchVariants: { where: { branchId } } } } },
          },
          modifierGroups: {
            include: { modifierGroup: { include: { options: true } } },
          },
        },
      },
      branchVariants: { where: { branchId } },
    },
  });
  if (!v || !v.isActive || !v.menuItem.isActive)
    throw new AppError(
      "ITEM_UNAVAILABLE",
      "The selected item is unavailable.",
      422,
    );
  if (v.menuItem.isCombo && (v.menuItem.comboComponents.length < 2 || v.menuItem.comboComponents.some((component: any) => {
    const override = component.variant.branchVariants[0];
    return !component.variant.isActive || !component.variant.menuItem.isActive || (override && (!override.isAvailable || (override.soldOutUntil && override.soldOutUntil > new Date())));
  })))
    throw new AppError("COMBO_UNAVAILABLE", "An item included in this deal or combo is unavailable.", 422);
  return v;
}
export const cartService = {
  async getOrCreate(
    userId: string,
    branchId: string,
    fulfillmentType: "DELIVERY" | "PICKUP",
  ) {
    const p = await customer(userId);
    let c = await cartRepository.active(p.id, branchId, fulfillmentType);
    if (!c) {
      const branch = await getPrisma().branch.findFirst({
        where: { id: branchId, isActive: true, business: { status: "ACTIVE" } },
      });
      if (!branch) throw new NotFoundError("Branch");
      c = await getPrisma().cart.create({
        data: {
          customerId: p.id,
          branchId,
          fulfillmentType,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
        include: cartGraph,
      });
    }
    return cartDto(c, await priceCart(c));
  },
  async get(userId: string, cartId: string, couponCode?: string) {
    const { p, c } = await owned(userId, cartId);
    return cartDto(
      c,
      await priceCart(c, await validateCoupon(p.id, c, couponCode)),
    );
  },
  async add(userId: string, input: AddCartItemInput) {
    const { c } = await owned(userId, input.cartId);
    if (c.status !== "ACTIVE")
      throw new AppError("CART_NOT_ACTIVE", "The cart is not active.", 409);
    const v = await variantFor(c.branchId, input.variantId);
    if (v.menuItem.businessId !== c.branch.businessId)
      throw new AppError(
        "CROSS_BUSINESS_ITEM",
        "The item does not belong to the cart business.",
        422,
      );
    validateSelections(v, input.modifiers);
    await withTransaction({ actorType: "CUSTOMER", userId }, (tx) =>
      tx.cartItem.create({
        data: {
          cartId: c.id,
          variantId: input.variantId,
          quantity: input.quantity,
          specialInstructions: input.specialInstructions,
          modifiers: {
            create: input.modifiers.map((m) => ({
              optionId: m.optionId,
              quantity: m.quantity,
            })),
          },
        },
      }),
    );
    return this.get(userId, c.id);
  },
  async update(userId: string, itemId: string, input: UpdateCartItemInput) {
    const p = await customer(userId);
    const item = await getPrisma().cartItem.findFirst({
      where: { id: itemId, cart: { customerId: p.id, status: "ACTIVE" } },
      include: {
        cart: true,
        variant: {
          include: {
            menuItem: {
              include: {
                modifierGroups: {
                  include: { modifierGroup: { include: { options: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundError("Cart item");
    if (input.modifiers) validateSelections(item.variant, input.modifiers);
    await withTransaction({ actorType: "CUSTOMER", userId }, async (tx) => {
      if (input.modifiers) {
        await tx.cartItemModifier.deleteMany({ where: { cartItemId: itemId } });
        await tx.cartItemModifier.createMany({
          data: input.modifiers.map((m) => ({ cartItemId: itemId, ...m })),
        });
      }
      await tx.cartItem.update({
        where: { id: itemId },
        data: {
          quantity: input.quantity,
          specialInstructions: input.specialInstructions,
        },
      });
    });
    return this.get(userId, item.cartId);
  },
  async remove(userId: string, itemId: string) {
    const p = await customer(userId);
    const item = await getPrisma().cartItem.findFirst({
      where: { id: itemId, cart: { customerId: p.id, status: "ACTIVE" } },
    });
    if (!item) throw new NotFoundError("Cart item");
    await getPrisma().cartItem.delete({ where: { id: itemId } });
    return this.get(userId, item.cartId);
  },
  async clear(userId: string, cartId: string) {
    const { c } = await owned(userId, cartId);
    await getPrisma().cartItem.deleteMany({ where: { cartId: c.id } });
    return this.get(userId, c.id);
  },
  async fulfillment(
    userId: string,
    cartId: string,
    fulfillmentType: "DELIVERY" | "PICKUP",
  ) {
    const { c } = await owned(userId, cartId);
    const row = await getPrisma().cart.update({
      where: { id: c.id },
      data: {
        fulfillmentType,
        addressId: fulfillmentType === "PICKUP" ? null : undefined,
      },
      include: cartGraph,
    });
    return cartDto(row, await priceCart(row));
  },
  async address(userId: string, cartId: string, addressId: string | null) {
    const { p, c } = await owned(userId, cartId);
    if (
      addressId &&
      !(await getPrisma().customerAddress.findFirst({
        where: { id: addressId, userId: p.userId },
      }))
    )
      throw new NotFoundError("Address");
    const row = await getPrisma().cart.update({
      where: { id: c.id },
      data: { addressId },
      include: cartGraph,
    });
    return cartDto(row, await priceCart(row));
  },
  async quote(userId: string, cartId: string, couponCode?: string) {
    const { p, c } = await owned(userId, cartId);
    return priceCart(c, await validateCoupon(p.id, c, couponCode));
  },
};
