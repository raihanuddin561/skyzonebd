/**
 * Bangladesh Standard Time (BST) Utilities
 * Timezone: Asia/Dhaka (UTC+6, strictly fixed year-round with no DST)
 *
 * Provides exact calendar day/month/year boundary timestamps in UTC for PostgreSQL queries.
 */

export const DHAKA_TIMEZONE = 'Asia/Dhaka';
export const DHAKA_OFFSET_HOURS = 6;
export const DHAKA_OFFSET_MS = DHAKA_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Returns current Date in UTC representing wall clock now.
 */
export function getDhakaNow(): Date {
  return new Date();
}

/**
 * Converts a UTC date to Dhaka year, month, date, hour, minute, second
 */
export function getDhakaComponents(date: Date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number;
  minutes: number;
  seconds: number;
} {
  // Add 6 hours to UTC to get Dhaka wall-clock
  const dhakaTimeMs = date.getTime() + DHAKA_OFFSET_MS;
  const d = new Date(dhakaTimeMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
  };
}

/**
 * Creates a UTC Date corresponding to a specific year, month, day, hours at Asia/Dhaka.
 * Example: dhakaToUtcDate(2026, 11, 3, 0, 0, 0) -> 2026-11-02T18:00:00.000Z
 */
export function dhakaToUtcDate(
  year: number,
  month: number, // 1-12
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  ms: number = 0
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms) - DHAKA_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Gets exact start (00:00:00.000) and end (23:59:59.999) of a Dhaka day in UTC.
 */
export function getDhakaDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const comp = getDhakaComponents(date);
  const start = dhakaToUtcDate(comp.year, comp.month, comp.day, 0, 0, 0, 0);
  const end = dhakaToUtcDate(comp.year, comp.month, comp.day, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Gets exact start and end of a Dhaka month in UTC.
 */
export function getDhakaMonthBounds(date: Date = new Date()): { start: Date; end: Date } {
  const comp = getDhakaComponents(date);
  const start = dhakaToUtcDate(comp.year, comp.month, 1, 0, 0, 0, 0);
  // Last day of month
  const nextMonthComp = comp.month === 12 
    ? { year: comp.year + 1, month: 1 } 
    : { year: comp.year, month: comp.month + 1 };
  const endMs = dhakaToUtcDate(nextMonthComp.year, nextMonthComp.month, 1, 0, 0, 0, 0).getTime() - 1;
  return { start, end: new Date(endMs) };
}

/**
 * Gets exact start and end of a Dhaka year in UTC.
 */
export function getDhakaYearBounds(date: Date = new Date()): { start: Date; end: Date } {
  const comp = getDhakaComponents(date);
  const start = dhakaToUtcDate(comp.year, 1, 1, 0, 0, 0, 0);
  const endMs = dhakaToUtcDate(comp.year + 1, 1, 1, 0, 0, 0, 0).getTime() - 1;
  return { start, end: new Date(endMs) };
}

/**
 * Gets standard period range for admin stats / analytics with previous comparison period.
 */
export function getDhakaPeriodRange(period: 'today' | 'week' | 'month' | 'year' | number): {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const now = new Date();
  const dhakaNow = getDhakaComponents(now);

  if (period === 'today') {
    const todayBounds = getDhakaDayBounds(now);
    // Yesterday
    const yesterdayMs = now.getTime() - 24 * 60 * 60 * 1000;
    const yesterdayBounds = getDhakaDayBounds(new Date(yesterdayMs));
    return {
      start: todayBounds.start,
      end: todayBounds.end,
      prevStart: yesterdayBounds.start,
      prevEnd: yesterdayBounds.end,
    };
  }

  if (period === 'week') {
    // 7 days ending today
    const todayBounds = getDhakaDayBounds(now);
    const startMs = todayBounds.start.getTime() - 6 * 24 * 60 * 60 * 1000;
    const prevEndMs = startMs - 1;
    const prevStartMs = startMs - 7 * 24 * 60 * 60 * 1000;
    return {
      start: new Date(startMs),
      end: todayBounds.end,
      prevStart: new Date(prevStartMs),
      prevEnd: new Date(prevEndMs),
    };
  }

  if (period === 'month') {
    const monthBounds = getDhakaMonthBounds(now);
    // Previous calendar month
    const prevMonthDate = new Date(monthBounds.start.getTime() - 24 * 60 * 60 * 1000);
    const prevMonthBounds = getDhakaMonthBounds(prevMonthDate);
    return {
      start: monthBounds.start,
      end: monthBounds.end,
      prevStart: prevMonthBounds.start,
      prevEnd: prevMonthBounds.end,
    };
  }

  if (period === 'year') {
    const yearBounds = getDhakaYearBounds(now);
    const prevYearDate = new Date(yearBounds.start.getTime() - 24 * 60 * 60 * 1000);
    const prevYearBounds = getDhakaYearBounds(prevYearDate);
    return {
      start: yearBounds.start,
      end: yearBounds.end,
      prevStart: prevYearBounds.start,
      prevEnd: prevYearBounds.end,
    };
  }

  // Number of days (e.g. 7, 30, 90)
  const days = typeof period === 'number' ? period : parseInt(period) || 30;
  const todayBounds = getDhakaDayBounds(now);
  const startMs = todayBounds.end.getTime() - days * 24 * 60 * 60 * 1000;
  const prevEndMs = startMs;
  const prevStartMs = startMs - days * 24 * 60 * 60 * 1000;

  return {
    start: new Date(startMs),
    end: todayBounds.end,
    prevStart: new Date(prevStartMs),
    prevEnd: new Date(prevEndMs),
  };
}

/**
 * Format date in Bangladesh time string
 */
export function formatDhakaDateTime(date: Date | string | number): string {
  const d = typeof date === 'object' ? date : new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

