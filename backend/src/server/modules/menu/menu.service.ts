import "server-only";
import type { BusinessActor } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { ConflictError, NotFoundError } from "@/server/http/errors";
import { auditRepository } from "@/server/modules/audit/audit.repository";
import { mapAdminMenu, mapPublicMenu } from "@/server/modules/menu/menu.mapper";
import { menuRepository } from "@/server/modules/menu/menu.repository";
import type * as Input from "@/server/modules/menu/menu.schemas";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";

const actorTx = (
  actor: BusinessActor,
  fn: Parameters<typeof withTransaction>[1],
) =>
  withTransaction({ actorType: "BUSINESS", userId: actor.userId }, fn as any);
async function changed(
  tx: any,
  actor: BusinessActor,
  requestId: string,
  entityType: string,
  entityId: string,
  action: string,
  after: unknown,
) {
  await auditRepository.write(tx, {
    businessId: actor.businessId,
    actorUserId: actor.userId,
    actorType: "BUSINESS",
    action,
    entityType,
    entityId,
    after,
    requestId,
  });
  await outboxRepository.write(tx, {
    aggregateType: entityType,
    aggregateId: entityId,
    eventType: "MenuChanged",
    payload: { businessId: actor.businessId, entityType, entityId, requestId },
  });
}
async function requireBranch(businessId: string, branchId: string) {
  const branch = await menuRepository.findBranch(branchId);
  if (!branch || branch.businessId !== businessId)
    throw new NotFoundError("Branch");
  return branch;
}

export const menuService = {
  async listAdmin(actor: BusinessActor) {
    return mapAdminMenu(await menuRepository.listAdmin(actor.businessId));
  },
  async createCategory(
    actor: BusinessActor,
    input: Input.CreateCategoryInput,
    requestId: string,
  ) {
    return actorTx(actor, async (tx: any) => {
      const row = await menuRepository.createCategory(
        tx,
        actor.businessId,
        input,
      );
      await changed(
        tx,
        actor,
        requestId,
        "MenuCategory",
        row.id,
        "menu.category.create",
        row,
      );
      return row;
    });
  },
  async updateCategory(
    actor: BusinessActor,
    id: string,
    input: Input.UpdateCategoryInput,
    requestId: string,
  ) {
    if (!(await menuRepository.category(actor.businessId, id)))
      throw new NotFoundError("Menu category");
    return actorTx(actor, async (tx: any) => {
      const row = await menuRepository.updateCategory(tx, id, input);
      await changed(
        tx,
        actor,
        requestId,
        "MenuCategory",
        id,
        "menu.category.update",
        row,
      );
      return row;
    });
  },
  async createItem(
    actor: BusinessActor,
    input: Input.CreateItemInput,
    requestId: string,
  ) {
    if (!(await menuRepository.category(actor.businessId, input.categoryId)))
      throw new NotFoundError("Menu category");
    return actorTx(actor, async (tx: any) => {
      const row = await menuRepository.createItem(tx, actor.businessId, input);
      await changed(
        tx,
        actor,
        requestId,
        "MenuItem",
        row.id,
        "menu.item.create",
        row,
      );
      return mapAdminMenu([{ id: "", items: [row] }])[0].items[0];
    });
  },
  async createDealCombo(
    actor: BusinessActor,
    input: Input.CreateDealComboInput,
    requestId: string,
  ) {
    if (!(await menuRepository.category(actor.businessId, input.categoryId)))
      throw new NotFoundError("Menu category");
    const variants = await getPrisma().menuItemVariant.findMany({
      where: { id: { in: input.components.map((row) => row.variantId) }, menuItem: { businessId: actor.businessId } },
      include: { menuItem: true },
    });
    if (variants.length !== input.components.length)
      throw new NotFoundError("Menu component");
    if (variants.some((variant) => variant.menuItem.isCombo))
      throw new ConflictError("NESTED_COMBO_NOT_ALLOWED", "Deals and combos cannot contain another deal or combo.");
    return actorTx(actor, async (tx: any) => {
      const row = await tx.menuItem.create({
        data: {
          businessId: actor.businessId,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          isActive: true,
          isCombo: true,
          itemType: input.kind,
          variants: { create: { sku: input.sku, name: "Bundle", basePrice: input.price, isDefault: true, isActive: true, prepMinutes: input.prepMinutes } },
          comboComponents: { create: input.components.map((component, index) => ({ ...component, sortOrder: index })) },
        },
        include: {
          variants: true,
          comboComponents: { include: { variant: { include: { menuItem: true } } } },
          modifierGroups: { include: { modifierGroup: { include: { options: true } } } },
        },
      });
      await changed(tx, actor, requestId, "MenuItem", row.id, "menu.deal-combo.create", row);
      return mapAdminMenu([{ id: "", items: [row] }])[0].items[0];
    });
  },
  async updateItem(
    actor: BusinessActor,
    id: string,
    input: Input.UpdateItemInput,
    requestId: string,
  ) {
    const current = await menuRepository.item(actor.businessId, id);
    if (!current) throw new NotFoundError("Menu item");
    if (
      input.categoryId &&
      !(await menuRepository.category(actor.businessId, input.categoryId))
    )
      throw new NotFoundError("Menu category");
    if (input.itemType === "STANDARD" && current.isCombo)
      throw new ConflictError("COMBO_TYPE_REQUIRED", "A deal or combo cannot be converted into a standard item while it has bundle components.");
    if ((input.itemType === "DEAL" || input.itemType === "COMBO") && !current.isCombo)
      throw new ConflictError("STANDARD_ITEM_TYPE_REQUIRED", "Create a deal or combo with selected components instead of converting a standard item.");
    return actorTx(actor, async (tx: any) => {
      const row = await menuRepository.updateItem(tx, id, input);
      await changed(
        tx,
        actor,
        requestId,
        "MenuItem",
        id,
        "menu.item.update",
        row,
      );
      return mapAdminMenu([{ id: "", items: [row] }])[0].items[0];
    });
  },
  async deleteItem(actor: BusinessActor, id: string, requestId: string) {
    const current = await menuRepository.item(actor.businessId, id);
    if (!current) throw new NotFoundError("Menu item");
    return actorTx(actor, async (tx: any) => {
      await tx.menuItem.delete({ where: { id } });
      await changed(tx, actor, requestId, "MenuItem", id, "menu.item.delete", null);
      return { id, deleted: true };
    });
  },
  async createVariant(
    actor: BusinessActor,
    itemId: string,
    input: Input.CreateVariantInput,
    requestId: string,
  ) {
    if (!(await menuRepository.item(actor.businessId, itemId)))
      throw new NotFoundError("Menu item");
    return actorTx(actor, async (tx: any) => {
      if (input.isDefault)
        await tx.menuItemVariant.updateMany({
          where: { menuItemId: itemId },
          data: { isDefault: false },
        });
      const row = await menuRepository.createVariant(tx, itemId, input);
      await changed(
        tx,
        actor,
        requestId,
        "MenuItemVariant",
        row.id,
        "menu.variant.create",
        row,
      );
      return { ...row, basePrice: row.basePrice.toString() };
    });
  },
  async updateVariant(
    actor: BusinessActor,
    id: string,
    input: Input.UpdateVariantInput,
    requestId: string,
  ) {
    const current = await menuRepository.variant(actor.businessId, id);
    if (!current) throw new NotFoundError("Menu variant");
    return actorTx(actor, async (tx: any) => {
      if (input.isDefault)
        await tx.menuItemVariant.updateMany({
          where: { menuItemId: current.menuItemId },
          data: { isDefault: false },
        });
      const row = await menuRepository.updateVariant(tx, id, input);
      await changed(
        tx,
        actor,
        requestId,
        "MenuItemVariant",
        id,
        "menu.variant.update",
        row,
      );
      return { ...row, basePrice: row.basePrice.toString() };
    });
  },
  async createGroup(
    actor: BusinessActor,
    input: Input.CreateModifierGroupInput,
    requestId: string,
  ) {
    return actorTx(actor, async (tx: any) => {
      const row = await tx.modifierGroup.create({
        data: { businessId: actor.businessId, ...input },
      });
      await changed(
        tx,
        actor,
        requestId,
        "ModifierGroup",
        row.id,
        "menu.modifier-group.create",
        row,
      );
      return row;
    });
  },
  async createOption(
    actor: BusinessActor,
    groupId: string,
    input: Input.CreateModifierOptionInput,
    requestId: string,
  ) {
    if (!(await menuRepository.group(actor.businessId, groupId)))
      throw new NotFoundError("Modifier group");
    return actorTx(actor, async (tx: any) => {
      const row = await tx.modifierOption.create({
        data: { modifierGroupId: groupId, ...input },
      });
      await changed(
        tx,
        actor,
        requestId,
        "ModifierOption",
        row.id,
        "menu.modifier-option.create",
        row,
      );
      return { ...row, priceDelta: row.priceDelta.toString() };
    });
  },
  async attachGroup(
    actor: BusinessActor,
    itemId: string,
    groupId: string,
    input: Input.AttachModifierGroupInput,
    requestId: string,
  ) {
    if (!(await menuRepository.item(actor.businessId, itemId)))
      throw new NotFoundError("Menu item");
    if (!(await menuRepository.group(actor.businessId, groupId)))
      throw new NotFoundError("Modifier group");
    return actorTx(actor, async (tx: any) => {
      const row = await tx.menuItemModifierGroup.upsert({
        where: {
          menuItemId_modifierGroupId: {
            menuItemId: itemId,
            modifierGroupId: groupId,
          },
        },
        create: { menuItemId: itemId, modifierGroupId: groupId, ...input },
        update: input,
      });
      await changed(
        tx,
        actor,
        requestId,
        "MenuItemModifierGroup",
        `${itemId}:${groupId}`,
        "menu.modifier-group.attach",
        row,
      );
      return row;
    });
  },
  async configureVariant(
    actor: BusinessActor,
    branchId: string,
    variantId: string,
    input: Input.ConfigureBranchVariantInput,
    requestId: string,
  ) {
    await requireBranch(actor.businessId, branchId);
    if (!(await menuRepository.variant(actor.businessId, variantId)))
      throw new NotFoundError("Menu variant");
    return actorTx(actor, async (tx: any) => {
      const row = await tx.branchMenuItemVariant.upsert({
        where: { branchId_variantId: { branchId, variantId } },
        create: { branchId, variantId, ...input },
        update: input,
      });
      await changed(
        tx,
        actor,
        requestId,
        "BranchMenuItemVariant",
        `${branchId}:${variantId}`,
        "menu.branch-variant.configure",
        row,
      );
      return { ...row, priceOverride: row.priceOverride?.toString() ?? null };
    });
  },
  async resetVariant(
    actor: BusinessActor,
    branchId: string,
    variantId: string,
    requestId: string,
  ) {
    await requireBranch(actor.businessId, branchId);
    if (!(await menuRepository.variant(actor.businessId, variantId)))
      throw new NotFoundError("Menu variant");
    return actorTx(actor, async (tx: any) => {
      await tx.branchMenuItemVariant.deleteMany({ where: { branchId, variantId } });
      await changed(tx, actor, requestId, "BranchMenuItemVariant", `${branchId}:${variantId}`, "menu.branch-variant.reset", null);
      return { branchId, variantId, reset: true };
    });
  },
  async configureOption(
    actor: BusinessActor,
    branchId: string,
    optionId: string,
    input: Input.ConfigureBranchModifierInput,
    requestId: string,
  ) {
    await requireBranch(actor.businessId, branchId);
    if (!(await menuRepository.option(actor.businessId, optionId)))
      throw new NotFoundError("Modifier option");
    return actorTx(actor, async (tx: any) => {
      const row = await tx.branchModifierOption.upsert({
        where: { branchId_optionId: { branchId, optionId } },
        create: { branchId, optionId, ...input },
        update: input,
      });
      await changed(
        tx,
        actor,
        requestId,
        "BranchModifierOption",
        `${branchId}:${optionId}`,
        "menu.branch-modifier.configure",
        row,
      );
      return { ...row, priceOverride: row.priceOverride?.toString() ?? null };
    });
  },
  async publicMenu(branchId: string, itemId?: string) {
    const branch = await menuRepository.findBranch(branchId);
    if (!branch || !branch.isActive || branch.business.status !== "ACTIVE")
      throw new NotFoundError("Branch");
    const mapped = mapPublicMenu(
      await menuRepository.publicMenu(branch.businessId, branchId),
    );
    if (!itemId)
      return {
        branchId,
        business: {
          id: branch.business.id,
          name: branch.business.displayName,
          slug: branch.business.slug,
          currency: branch.business.defaultCurrency,
        },
        categories: mapped,
      };
    const item = mapped
      .flatMap((c: any) =>
        c.items.map((i: any) => ({
          ...i,
          category: { id: c.id, name: c.name, slug: c.slug },
        })),
      )
      .find((i: any) => i.id === itemId);
    if (!item) throw new NotFoundError("Menu item");
    return item;
  },
};
