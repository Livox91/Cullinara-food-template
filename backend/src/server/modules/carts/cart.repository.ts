import "server-only";
import { getPrisma } from "@/server/db/prisma";
export const cartGraph = {
  branch: { include: { business: true, hours: true, specialHours: true } },
  address: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          menuItem: {
            include: {
              comboComponents: {
                include: {
                  variant: {
                    include: { menuItem: true, branchVariants: true },
                  },
                },
              },
              modifierGroups: {
                include: { modifierGroup: { include: { options: true } } },
              },
            },
          },
          branchVariants: true,
        },
      },
      modifiers: {
        include: {
          option: { include: { modifierGroup: true, branchOptions: true } },
        },
      },
    },
  },
} as const;
export const cartRepository = {
  profile: (userId: string) =>
    getPrisma().customerProfile.findUnique({ where: { userId } }),
  owned: (customerId: string, cartId: string) =>
    getPrisma().cart.findFirst({
      where: { id: cartId, customerId },
      include: cartGraph,
    }),
  active: (
    customerId: string,
    branchId: string,
    fulfillmentType: "DELIVERY" | "PICKUP",
  ) =>
    getPrisma().cart.findFirst({
      where: { customerId, branchId, fulfillmentType, status: "ACTIVE" },
      include: cartGraph,
    }),
};
