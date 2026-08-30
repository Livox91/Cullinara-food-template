import { describe, expect, it } from "vitest";
import {
  assertNonOverlappingIntervals,
  findOverlappingIntervalIndexes,
  getBranchOpenState,
} from "./branch-hours.policy";
import { WeeklyOperatingDaySchema } from "./branch.schemas";

const weeklyHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isClosed: false,
  intervals: [{ opensAt: "11:00", closesAt: "02:00" }],
}));

describe("branch operating-hours policy", () => {
  it("recognizes regular and overnight opening windows in the branch timezone", () => {
    expect(
      getBranchOpenState(
        new Date("2026-08-30T09:00:00Z"),
        "Asia/Karachi",
        weeklyHours,
        [],
      ).isOpen,
    ).toBe(true);
    expect(
      getBranchOpenState(
        new Date("2026-08-29T20:30:00Z"),
        "Asia/Karachi",
        weeklyHours,
        [],
      ).isOpen,
    ).toBe(true);
    expect(
      getBranchOpenState(
        new Date("2026-08-29T21:00:00Z"),
        "Asia/Karachi",
        weeklyHours,
        [],
      ).isOpen,
    ).toBe(false);
    expect(
      getBranchOpenState(
        new Date("2026-08-30T04:00:00Z"),
        "Asia/Karachi",
        weeklyHours,
        [],
      ).isOpen,
    ).toBe(false);
  });

  it("lets special hours override the weekly schedule", () => {
    const result = getBranchOpenState(
      new Date("2026-08-30T09:00:00Z"),
      "Asia/Karachi",
      weeklyHours,
      [{ date: "2026-08-30", isClosed: true, intervals: [] }],
    );
    expect(result).toMatchObject({ isOpen: false, source: "SPECIAL_HOURS" });
  });

  it("detects overlapping operating intervals", () => {
    const intervals = [
      { opensAt: "11:00", closesAt: "15:00" },
      { opensAt: "14:00", closesAt: "18:00" },
    ];
    expect(findOverlappingIntervalIndexes(intervals)).toEqual([0, 1]);
    expect(() => assertNonOverlappingIntervals(intervals)).toThrow(
      "cannot overlap",
    );
    expect(() =>
      WeeklyOperatingDaySchema.parse({
        dayOfWeek: 1,
        isClosed: false,
        intervals,
      }),
    ).toThrow("cannot overlap");
  });
});
