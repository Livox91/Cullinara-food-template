export interface OperatingInterval {
  opensAt: string;
  closesAt: string;
}

export interface WeeklyOperatingDay {
  dayOfWeek: number;
  isClosed: boolean;
  intervals: OperatingInterval[];
}

export interface SpecialOperatingDay {
  date: string;
  isClosed: boolean;
  intervals: OperatingInterval[];
}

export interface BranchOpenState {
  isOpen: boolean;
  localDate: string;
  localTime: string;
  source: "SPECIAL_HOURS" | "WEEKLY_HOURS";
}

function minuteOfDay(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function normalizedIntervals(intervals: OperatingInterval[]) {
  return intervals
    .map((interval) => {
      const start = minuteOfDay(interval.opensAt);
      const rawEnd = minuteOfDay(interval.closesAt);
      return { start, end: rawEnd <= start ? rawEnd + 1_440 : rawEnd };
    })
    .sort((left, right) => left.start - right.start);
}

export function findOverlappingIntervalIndexes(
  intervals: OperatingInterval[],
): number[] {
  const normalized = normalizedIntervals(intervals);
  const overlapping = new Set<number>();
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].start < normalized[index - 1].end) {
      overlapping.add(index - 1);
      overlapping.add(index);
    }
  }
  return [...overlapping];
}

export function assertNonOverlappingIntervals(
  intervals: OperatingInterval[],
): void {
  if (findOverlappingIntervalIndexes(intervals).length > 0) {
    throw new Error("Operating intervals cannot overlap.");
  }
}

function localClock(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    value("weekday"),
  );
  const localDate = `${value("year")}-${value("month")}-${value("day")}`;
  const localTime = `${value("hour")}:${value("minute")}`;
  return { weekday, localDate, localTime, minute: minuteOfDay(localTime) };
}

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}

function currentDayContains(
  day: WeeklyOperatingDay | SpecialOperatingDay | undefined,
  minute: number,
): boolean {
  if (!day || day.isClosed) return false;
  return day.intervals.some((interval) => {
    const start = minuteOfDay(interval.opensAt);
    const end = minuteOfDay(interval.closesAt);
    return end > start ? minute >= start && minute < end : minute >= start;
  });
}

function previousDayCarriesOver(
  day: WeeklyOperatingDay | SpecialOperatingDay | undefined,
  minute: number,
): boolean {
  if (!day || day.isClosed) return false;
  return day.intervals.some((interval) => {
    const start = minuteOfDay(interval.opensAt);
    const end = minuteOfDay(interval.closesAt);
    return end < start && minute < end;
  });
}

export function getBranchOpenState(
  at: Date,
  timeZone: string,
  weeklyHours: WeeklyOperatingDay[],
  specialHours: SpecialOperatingDay[],
): BranchOpenState {
  const local = localClock(at, timeZone);
  const specialToday = specialHours.find((day) => day.date === local.localDate);
  const specialYesterday = specialHours.find(
    (day) => day.date === previousDate(local.localDate),
  );
  const weeklyToday = weeklyHours.find(
    (day) => day.dayOfWeek === local.weekday,
  );
  const weeklyYesterday = weeklyHours.find(
    (day) => day.dayOfWeek === (local.weekday + 6) % 7,
  );
  const today = specialToday ?? weeklyToday;
  const yesterday = specialYesterday ?? weeklyYesterday;
  const isOpen =
    currentDayContains(today, local.minute) ||
    previousDayCarriesOver(yesterday, local.minute);

  return {
    isOpen,
    localDate: local.localDate,
    localTime: local.localTime,
    source: specialToday || specialYesterday ? "SPECIAL_HOURS" : "WEEKLY_HOURS",
  };
}
