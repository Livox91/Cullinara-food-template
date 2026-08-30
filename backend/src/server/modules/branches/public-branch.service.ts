import "server-only";
import { getPrisma } from "@/server/db/prisma";
import { NotFoundError } from "@/server/http/errors";
import { toBranchDto } from "@/server/modules/branches/branch.mapper";

const include = {
  hours: true,
  specialHours: true,
  business: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      status: true,
      timezone: true,
    },
  },
} as const;
export const publicBranchService = {
  async list(query: { city?: string; businessSlug?: string }) {
    const rows = await getPrisma().branch.findMany({
      where: {
        isActive: true,
        business: {
          status: "ACTIVE",
          ...(query.businessSlug ? { slug: query.businessSlug } : {}),
        },
        ...(query.city
          ? { city: { equals: query.city, mode: "insensitive" } }
          : {}),
      },
      include,
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });
    return rows.map((b: any) => ({
      ...toBranchDto(b),
      business: {
        id: b.business.id,
        name: b.business.displayName,
        slug: b.business.slug,
      },
    }));
  },
  async get(id: string) {
    const b: any = await getPrisma().branch.findFirst({
      where: { id, isActive: true, business: { status: "ACTIVE" } },
      include,
    });
    if (!b) throw new NotFoundError("Branch");
    return {
      ...toBranchDto(b),
      business: {
        id: b.business.id,
        name: b.business.displayName,
        slug: b.business.slug,
      },
    };
  },
  async availability(id: string, scheduledFor?: Date) {
    const row: any = await getPrisma().branch.findFirst({
      where: { id, isActive: true, business: { status: "ACTIVE" } },
      include,
    });
    if (!row) throw new NotFoundError("Branch");
    const b = toBranchDto(row, scheduledFor ?? new Date());
    return {
      branchId: id,
      canAcceptOrders: b.isActive && b.isAcceptingOrders && b.isOpenNow,
      isOpen: b.isOpenNow,
      isAcceptingOrders: b.isAcceptingOrders,
      scheduledFor: scheduledFor?.toISOString() ?? null,
      minimumOrderAmount: b.minimumOrderAmount,
    };
  },
};
