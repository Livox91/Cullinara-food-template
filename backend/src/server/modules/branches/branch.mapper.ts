import type {
  Branch,
  BranchHour,
  BranchSpecialHour,
  Business,
} from "../../../../generated/prisma/client";
import { getBranchOpenState } from "@/server/modules/branches/branch-hours.policy";
import type {
  BranchDto,
  BranchHoursDto,
} from "@/server/modules/branches/branch.types";

export type BranchWithHours = Branch & {
  hours: BranchHour[];
  specialHours: BranchSpecialHour[];
  business: Pick<Business, "timezone">;
};

function timeValue(value: Date): string {
  return `${value.getUTCHours().toString().padStart(2, "0")}:${value.getUTCMinutes().toString().padStart(2, "0")}`;
}

function weeklyPolicy(branch: BranchWithHours) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: !branch.hours.some((hour) => hour.dayOfWeek === dayOfWeek),
    intervals: branch.hours
      .filter((hour) => hour.dayOfWeek === dayOfWeek)
      .map((hour) => ({
        opensAt: timeValue(hour.opensAt),
        closesAt: timeValue(hour.closesAt),
      })),
  }));
}

function specialPolicy(branch: BranchWithHours) {
  return branch.specialHours.map((special) => ({
    date: special.date.toISOString().slice(0, 10),
    isClosed: special.isClosed,
    intervals:
      special.opensAt && special.closesAt
        ? [
            {
              opensAt: timeValue(special.opensAt),
              closesAt: timeValue(special.closesAt),
            },
          ]
        : [],
  }));
}

export function toBranchDto(
  branch: BranchWithHours,
  now = new Date(),
): BranchDto {
  const openState = getBranchOpenState(
    now,
    branch.business.timezone,
    weeklyPolicy(branch),
    specialPolicy(branch),
  );
  return {
    id: branch.id,
    businessId: branch.businessId,
    code: branch.code,
    name: branch.name,
    phone: branch.phone,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    city: branch.city,
    province: branch.province,
    postalCode: branch.postalCode,
    latitude: branch.latitude.toString(),
    longitude: branch.longitude.toString(),
    isActive: branch.isActive,
    isAcceptingOrders: branch.isAcceptingOrders,
    minimumOrderAmount: branch.minimumOrderAmount.toString(),
    deliveryRadiusKm: branch.deliveryRadiusKm?.toString() ?? null,
    defaultPrepMinutes: branch.defaultPrepMinutes,
    timezone: branch.business.timezone,
    isOpenNow: openState.isOpen,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}

export function toBranchHoursDto(
  branch: BranchWithHours,
  now = new Date(),
): BranchHoursDto {
  const weekly = weeklyPolicy(branch);
  const special = branch.specialHours.map((item) => ({
    date: item.date.toISOString().slice(0, 10),
    isClosed: item.isClosed,
    opensAt: item.opensAt ? timeValue(item.opensAt) : null,
    closesAt: item.closesAt ? timeValue(item.closesAt) : null,
    note: item.note,
  }));
  const openState = getBranchOpenState(
    now,
    branch.business.timezone,
    weekly,
    specialPolicy(branch),
  );
  return {
    branchId: branch.id,
    timezone: branch.business.timezone,
    isOpenNow: openState.isOpen,
    weekly: weekly.map(({ dayOfWeek, intervals }) => ({
      dayOfWeek,
      intervals,
    })),
    special,
  };
}
