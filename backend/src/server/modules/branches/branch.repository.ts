import "server-only";
import type {
  MembershipRole,
  Prisma,
} from "../../../../generated/prisma/client";
import type { PrismaTx } from "@/server/db/transaction";
import { getPrisma } from "@/server/db/prisma";
import type {
  CreateBranchInput,
  ReplaceWeeklyHoursInput,
  UpdateBranchInput,
  UpsertSpecialHoursInput,
} from "@/server/modules/branches/branch.schemas";

const branchInclude = {
  hours: { orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }] },
  specialHours: { orderBy: { date: "asc" } },
  business: { select: { timezone: true } },
} satisfies Prisma.BranchInclude;

function timeToDate(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export const branchRepository = {
  listAccessible(input: {
    businessId: string;
    membershipId: string;
    role: MembershipRole;
  }) {
    const unrestricted = input.role === "OWNER" || input.role === "ADMIN";
    return getPrisma().branch.findMany({
      where: {
        businessId: input.businessId,
        ...(unrestricted
          ? {}
          : { staffAccess: { some: { membershipId: input.membershipId } } }),
      },
      include: branchInclude,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  },

  findById(businessId: string, branchId: string) {
    return getPrisma().branch.findFirst({
      where: { id: branchId, businessId },
      include: branchInclude,
    });
  },

  findByIdInTransaction(tx: PrismaTx, businessId: string, branchId: string) {
    return tx.branch.findFirst({
      where: { id: branchId, businessId },
      include: branchInclude,
    });
  },

  create(tx: PrismaTx, businessId: string, input: CreateBranchInput) {
    return tx.branch.create({
      data: {
        businessId,
        code: input.code,
        name: input.name,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        province: input.province,
        postalCode: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        minimumOrderAmount: input.minimumOrderAmount,
        deliveryRadiusKm: input.deliveryRadiusKm,
        defaultPrepMinutes: input.defaultPrepMinutes,
      },
      include: branchInclude,
    });
  },

  update(tx: PrismaTx, branchId: string, input: UpdateBranchInput) {
    return tx.branch.update({
      where: { id: branchId },
      data: input,
      include: branchInclude,
    });
  },

  setOrderAcceptance(
    tx: PrismaTx,
    branchId: string,
    isAcceptingOrders: boolean,
  ) {
    return tx.branch.update({
      where: { id: branchId },
      data: { isAcceptingOrders },
      include: branchInclude,
    });
  },

  async replaceWeeklyHours(
    tx: PrismaTx,
    branchId: string,
    input: ReplaceWeeklyHoursInput,
  ) {
    await tx.branchHour.deleteMany({ where: { branchId } });
    const intervals = input.days.flatMap((day) =>
      day.isClosed
        ? []
        : day.intervals.map((interval) => ({
            branchId,
            dayOfWeek: day.dayOfWeek,
            opensAt: timeToDate(interval.opensAt),
            closesAt: timeToDate(interval.closesAt),
          })),
    );
    if (intervals.length > 0)
      await tx.branchHour.createMany({ data: intervals });
    return tx.branch.findUniqueOrThrow({
      where: { id: branchId },
      include: branchInclude,
    });
  },

  async upsertSpecialHours(
    tx: PrismaTx,
    branchId: string,
    input: UpsertSpecialHoursInput,
  ) {
    const interval = input.intervals[0];
    const date = dateOnly(input.date);
    await tx.branchSpecialHour.upsert({
      where: { branchId_date: { branchId, date } },
      create: {
        branchId,
        date,
        isClosed: input.isClosed,
        opensAt: interval ? timeToDate(interval.opensAt) : null,
        closesAt: interval ? timeToDate(interval.closesAt) : null,
        note: input.note,
      },
      update: {
        isClosed: input.isClosed,
        opensAt: interval ? timeToDate(interval.opensAt) : null,
        closesAt: interval ? timeToDate(interval.closesAt) : null,
        note: input.note,
      },
    });
    return tx.branch.findUniqueOrThrow({
      where: { id: branchId },
      include: branchInclude,
    });
  },
};
