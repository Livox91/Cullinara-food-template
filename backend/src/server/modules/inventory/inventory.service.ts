import "server-only";
import type { BusinessActor } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { NotFoundError } from "@/server/http/errors";
import { auditRepository } from "@/server/modules/audit/audit.repository";
import type { z } from "zod";
import type {
  AdjustmentSchema,
  IngredientSchema,
  MovementSchema,
  RecipeSchema,
  TransferSchema,
  UpdateIngredientSchema,
} from "@/server/modules/inventory/inventory.schemas";
const inventoryDto = (i: any) => ({
  id: i.id,
  branchId: i.branchId,
  ingredientId: i.ingredientId,
  ingredient: i.ingredient,
  quantityOnHand: i.quantityOnHand.toString(),
  quantityReserved: i.quantityReserved.toString(),
  available: i.quantityOnHand.minus(i.quantityReserved).toString(),
  reorderLevel: i.reorderLevel?.toString() ?? null,
});
async function branch(businessId: string, id: string) {
  const b = await getPrisma().branch.findFirst({ where: { id, businessId } });
  if (!b) throw new NotFoundError("Branch");
  return b;
}
async function ingredient(businessId: string, id: string) {
  const i = await getPrisma().ingredient.findFirst({
    where: { id, businessId },
  });
  if (!i) throw new NotFoundError("Ingredient");
  return i;
}
export const inventoryService = {
  async listIngredients(a: BusinessActor) {
    return getPrisma().ingredient.findMany({
      where: { businessId: a.businessId },
      orderBy: { name: "asc" },
    });
  },
  async createIngredient(
    a: BusinessActor,
    x: z.infer<typeof IngredientSchema>,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: a.userId },
      async (tx) => {
        const row = await tx.ingredient.create({
          data: { businessId: a.businessId, ...x },
        });
        await auditRepository.write(tx, {
          businessId: a.businessId,
          actorUserId: a.userId,
          actorType: "BUSINESS",
          action: "inventory.ingredient.create",
          entityType: "Ingredient",
          entityId: row.id,
          after: row,
          requestId,
        });
        return row;
      },
    );
  },
  async updateIngredient(
    a: BusinessActor,
    id: string,
    x: z.infer<typeof UpdateIngredientSchema>,
    requestId: string,
  ) {
    await ingredient(a.businessId, id);
    return withTransaction(
      { actorType: "BUSINESS", userId: a.userId },
      async (tx) => {
        const row = await tx.ingredient.update({ where: { id }, data: x });
        await auditRepository.write(tx, {
          businessId: a.businessId,
          actorUserId: a.userId,
          actorType: "BUSINESS",
          action: "inventory.ingredient.update",
          entityType: "Ingredient",
          entityId: id,
          after: row,
          requestId,
        });
        return row;
      },
    );
  },
  async setRecipe(
    a: BusinessActor,
    variantId: string,
    x: z.infer<typeof RecipeSchema>,
    requestId: string,
  ) {
    if (
      !(await getPrisma().menuItemVariant.findFirst({
        where: { id: variantId, menuItem: { businessId: a.businessId } },
      }))
    )
      throw new NotFoundError("Menu variant");
    for (const c of x.components)
      await ingredient(a.businessId, c.ingredientId);
    return withTransaction(
      { actorType: "BUSINESS", userId: a.userId },
      async (tx) => {
        await tx.recipeComponent.deleteMany({ where: { variantId } });
        if (x.components.length)
          await tx.recipeComponent.createMany({
            data: x.components.map((c) => ({ variantId, ...c })),
          });
        await auditRepository.write(tx, {
          businessId: a.businessId,
          actorUserId: a.userId,
          actorType: "BUSINESS",
          action: "inventory.recipe.replace",
          entityType: "MenuItemVariant",
          entityId: variantId,
          after: x,
          requestId,
        });
        return { variantId, components: x.components };
      },
    );
  },
  async list(a: BusinessActor, branchId: string) {
    await branch(a.businessId, branchId);
    return (
      await getPrisma().branchInventory.findMany({
        where: { branchId },
        include: { ingredient: true },
        orderBy: { ingredient: { name: "asc" } },
      })
    ).map(inventoryDto);
  },
  async movement(
    a: BusinessActor,
    branchId: string,
    x: z.infer<typeof MovementSchema>,
    reason: "PURCHASE" | "WASTE",
    requestId: string,
  ) {
    await branch(a.businessId, branchId);
    await ingredient(a.businessId, x.ingredientId);
    const delta = reason === "PURCHASE" ? x.quantity : -x.quantity;
    const row = await withTransaction(
      { actorType: "BUSINESS", userId: a.userId },
      async (tx) => {
        const m = await tx.inventoryMovement.create({
          data: {
            branchId,
            ingredientId: x.ingredientId,
            reason,
            deltaOnHand: delta,
            reference: x.reference,
          },
        });
        await auditRepository.write(tx, {
          businessId: a.businessId,
          actorUserId: a.userId,
          actorType: "BUSINESS",
          action: `inventory.${reason.toLowerCase()}`,
          entityType: "InventoryMovement",
          entityId: m.id,
          after: { ...x, reason },
          requestId,
        });
        return m;
      },
    );
    return {
      ...row,
      deltaOnHand: row.deltaOnHand.toString(),
      deltaReserved: row.deltaReserved.toString(),
    };
  },
  async adjust(
    a: BusinessActor,
    branchId: string,
    x: z.infer<typeof AdjustmentSchema>,
    requestId: string,
  ) {
    await branch(a.businessId, branchId);
    await ingredient(a.businessId, x.ingredientId);
    const row = await getPrisma().inventoryMovement.create({
      data: {
        branchId,
        ingredientId: x.ingredientId,
        reason: "MANUAL_ADJUSTMENT",
        deltaOnHand: x.deltaOnHand,
        reference: x.reference,
      },
    });
    return {
      ...row,
      deltaOnHand: row.deltaOnHand.toString(),
      deltaReserved: row.deltaReserved.toString(),
    };
  },
  async transfer(
    a: BusinessActor,
    x: z.infer<typeof TransferSchema>,
    requestId: string,
  ) {
    await branch(a.businessId, x.fromBranchId);
    await branch(a.businessId, x.toBranchId);
    await ingredient(a.businessId, x.ingredientId);
    return withTransaction(
      { actorType: "BUSINESS", userId: a.userId },
      async (tx) => {
        const reference =
          x.reference ?? `Transfer ${x.fromBranchId} -> ${x.toBranchId}`;
        const out = await tx.inventoryMovement.create({
          data: {
            branchId: x.fromBranchId,
            ingredientId: x.ingredientId,
            reason: "TRANSFER_OUT",
            deltaOnHand: -x.quantity,
            reference,
          },
        });
        const into = await tx.inventoryMovement.create({
          data: {
            branchId: x.toBranchId,
            ingredientId: x.ingredientId,
            reason: "TRANSFER_IN",
            deltaOnHand: x.quantity,
            reference,
          },
        });
        await auditRepository.write(tx, {
          businessId: a.businessId,
          actorUserId: a.userId,
          actorType: "BUSINESS",
          action: "inventory.transfer",
          entityType: "InventoryMovement",
          entityId: out.id,
          after: x,
          requestId,
        });
        return { outMovementId: out.id, inMovementId: into.id };
      },
    );
  },
};
