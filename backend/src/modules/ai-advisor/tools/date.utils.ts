/**
 * Shared date utilities for AI Advisor tools.
 * Ensures consistent date boundaries (e.g. current month) across all tools
 * to prevent mismatch between expense summary, budgets, and savings analysis.
 */

export function getCurrentMonthBounds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return getMonthBounds(month, year);
}

export function getMonthBounds(month: number, year: number) {
  // Use local time boundaries to match user's expected month
  // (matches Prisma's default behavior for Date objects without time)
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1), // half-open: strictly less than first day of next month
  };
}
