import "server-only";
import type { PrismaTx } from "@/server/db/transaction";
import { getPrisma } from "@/server/db/prisma";
import type * as Input from "@/server/modules/menu/menu.schemas";

const menuInclude = {
  variants: { orderBy: { createdAt: "asc" as const } },
  comboComponents: {
    orderBy: { sortOrder: "asc" as const },
    include: { variant: { include: { menuItem: true } } },
  },
  modifierGroups: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      modifierGroup: {
        include: { options: { orderBy: { sortOrder: "asc" as const } } },
      },
    },
  },
};

export const menuRepository = {
  listAdmin: (businessId: string) =>
    getPrisma().menuCategory.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: menuInclude,
        },
      },
    }),
  findBranch: (branchId: string) =>
    getPrisma().branch.findUnique({
      where: { id: branchId },
      include: { business: true },
    }),
  publicMenu: (businessId: string, branchId: string) =>
    getPrisma().menuCategory.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            variants: {
              where: { isActive: true },
              include: { branchVariants: { where: { branchId } } },
              orderBy: { createdAt: "asc" },
            },
            modifierGroups: {
              orderBy: { sortOrder: "asc" },
              include: {
                modifierGroup: {
                  include: {
                    options: {
                      where: { isActive: true },
                      include: { branchOptions: { where: { branchId } } },
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                },
              },
            },
            comboComponents: {
              orderBy: { sortOrder: "asc" },
              include: {
                variant: {
                  include: {
                    menuItem: true,
                    branchVariants: { where: { branchId } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  item: (businessId: string, itemId: string) =>
    getPrisma().menuItem.findFirst({
      where: { id: itemId, businessId },
      include: menuInclude,
    }),
  category: (businessId: string, id: string) =>
    getPrisma().menuCategory.findFirst({ where: { id, businessId } }),
  variant: (businessId: string, id: string) =>
    getPrisma().menuItemVariant.findFirst({
      where: { id, menuItem: { businessId } },
      include: { menuItem: true },
    }),
  group: (businessId: string, id: string) =>
    getPrisma().modifierGroup.findFirst({ where: { id, businessId } }),
  option: (businessId: string, id: string) =>
    getPrisma().modifierOption.findFirst({
      where: { id, modifierGroup: { businessId } },
    }),
  createCategory: (
    tx: PrismaTx,
    businessId: string,
    input: Input.CreateCategoryInput,
  ) => tx.menuCategory.create({ data: { businessId, ...input } }),
  updateCategory: (
    tx: PrismaTx,
    id: string,
    input: Input.UpdateCategoryInput,
  ) => tx.menuCategory.update({ where: { id }, data: input }),
  createItem: (
    tx: PrismaTx,
    businessId: string,
    input: Input.CreateItemInput,
  ) =>
    tx.menuItem.create({
      data: { businessId, ...input },
      include: menuInclude,
    }),
  updateItem: (tx: PrismaTx, id: string, input: Input.UpdateItemInput) =>
    tx.menuItem.update({ where: { id }, data: input, include: menuInclude }),
  createVariant: (
    tx: PrismaTx,
    menuItemId: string,
    input: Input.CreateVariantInput,
  ) => tx.menuItemVariant.create({ data: { menuItemId, ...input } }),
  updateVariant: (tx: PrismaTx, id: string, input: Input.UpdateVariantInput) =>
    tx.menuItemVariant.update({ where: { id }, data: input }),
};
