import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { CreateSavingInput, UpdateSavingInput, SavingsQuery } from '../validators/savings.validators';

// Helper: parse a YYYY-MM-DD string as midnight UTC to avoid timezone drift
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Helper: serialize Decimal fields to numbers safely
function serializeSaving(s: any) {
  return {
    ...s,
    amount:       Number(s.amount),
    targetAmount: s.targetAmount != null ? Number(s.targetAmount) : null,
  };
}

export class SavingService {
  // ── CREATE ───────────────────────────────────────────────────────────────────
  static async createSaving(userId: string, input: CreateSavingInput) {
    const data: Prisma.SavingCreateInput = {
      User:   { connect: { id: userId } },
      name:   input.name,
      amount: new Prisma.Decimal(input.amount),
      date:   parseDateOnly(input.date),
      type:   input.type,
      source: input.source,
      note:   input.note ?? null,
    };

    if (input.goalId) {
      const goal = await prisma.goal.findFirst({ where: { id: input.goalId, userId } });
      if (!goal) throw new Error('Invalid goal');
      data.Goal = { connect: { id: input.goalId } };
    }

    if (input.targetAmount != null) {
      data.targetAmount = new Prisma.Decimal(input.targetAmount);
    }
    if (input.targetDate) {
      data.targetDate = parseDateOnly(input.targetDate);
    }

    const saving = await prisma.saving.create({ data });
    return serializeSaving(saving);
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  static async getSavings(userId: string, query: SavingsQuery) {
    const { page, limit, search, from, to, month, year, type, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SavingWhereInput = { userId };

    // Date range from explicit from/to
    if (from || to) {
      where.date = {};
      if (from) (where.date as any).gte = parseDateOnly(from);
      if (to)   (where.date as any).lt  = parseDateOnly(to);
    } else if (month && year) {
      // Month filter: date >= first of month, date < first of next month
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end   = new Date(Date.UTC(year, month, 1));
      where.date = { gte: start, lt: end };
    } else if (year) {
      where.date = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt:  new Date(Date.UTC(year + 1, 0, 1)),
      };
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.SavingOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [total, records] = await Promise.all([
      prisma.saving.count({ where }),
      prisma.saving.findMany({ where, orderBy, skip, take: limit }),
    ]);

    return {
      data:  records.map(serializeSaving),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── GET ONE ──────────────────────────────────────────────────────────────────
  static async getSavingById(userId: string, id: string) {
    const saving = await prisma.saving.findFirst({ where: { id, userId } });
    return saving ? serializeSaving(saving) : null;
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  static async updateSaving(userId: string, id: string, input: UpdateSavingInput) {
    const existing = await prisma.saving.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Not found');

    const data: Prisma.SavingUpdateInput = {};

    if (input.name        !== undefined) data.name   = input.name;
    if (input.type        !== undefined) data.type   = input.type;
    if (input.source      !== undefined) data.source = input.source;
    if (input.note        !== undefined) data.note   = input.note;

    if (input.goalId      !== undefined) {
      if (input.goalId) {
        const goal = await prisma.goal.findFirst({ where: { id: input.goalId, userId } });
        if (!goal) throw new Error('Invalid goal');
        data.Goal = { connect: { id: input.goalId } };
      } else {
        data.Goal = { disconnect: true };
      }
    }

    if (input.amount      !== undefined)
      data.amount = new Prisma.Decimal(input.amount);

    if (input.date        !== undefined)
      data.date = parseDateOnly(input.date);

    if (input.targetAmount !== undefined)
      data.targetAmount = input.targetAmount != null
        ? new Prisma.Decimal(input.targetAmount) : null;

    if (input.targetDate  !== undefined)
      data.targetDate = input.targetDate != null
        ? parseDateOnly(input.targetDate) : null;

    const updated = await prisma.saving.update({ where: { id }, data });
    return serializeSaving(updated);
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  static async deleteSaving(userId: string, id: string) {
    const existing = await prisma.saving.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Not found');
    await prisma.saving.delete({ where: { id } });
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  static async getSummary(userId: string, month?: number, year?: number) {
    const now = new Date();
    const m   = month ?? now.getMonth() + 1;
    const y   = year  ?? now.getFullYear();

    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd   = new Date(Date.UTC(y, m, 1));

    const prevMonthStart = new Date(Date.UTC(y, m - 2, 1));
    const prevMonthEnd   = new Date(Date.UTC(y, m - 1, 1));

    // Aggregate this month
    const [thisMonthAgg, prevMonthAgg, totalAllTimeAgg, countAll] = await Promise.all([
      prisma.saving.aggregate({
        where:  { userId, date: { gte: monthStart, lt: monthEnd } },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      prisma.saving.aggregate({
        where:  { userId, date: { gte: prevMonthStart, lt: prevMonthEnd } },
        _sum:   { amount: true },
      }),
      prisma.saving.aggregate({
        where: { userId },
        _sum:  { amount: true },
      }),
      prisma.saving.count({ where: { userId } }),
    ]);

    const thisMonth     = Number(thisMonthAgg._sum.amount  ?? 0);
    const prevMonth     = Number(prevMonthAgg._sum.amount  ?? 0);
    const totalAllTime  = Number(totalAllTimeAgg._sum.amount ?? 0);
    const thisMonthCount = thisMonthAgg._count.id;

    // Monthly change percentage
    let monthlyChangePct = 0;
    if (prevMonth > 0) {
      monthlyChangePct = parseFloat((((thisMonth - prevMonth) / prevMonth) * 100).toFixed(1));
    }

    // Average monthly over last 6 months
    const sixMonthsAgo = new Date(Date.UTC(y, m - 7, 1));
    const sixMonthAgg  = await prisma.saving.aggregate({
      where: { userId, date: { gte: sixMonthsAgo, lt: monthEnd } },
      _sum:  { amount: true },
    });
    const avgMonthly = countAll > 0
      ? parseFloat((Number(sixMonthAgg._sum.amount ?? 0) / 6).toFixed(2))
      : 0;

    return {
      month:            m,
      year:             y,
      thisMonthTotal:   thisMonth,
      thisMonthCount,
      prevMonthTotal:   prevMonth,
      monthlyChangePct,
      totalAllTime,
      totalSaved:       totalAllTime,
      avgMonthly,
      projectedYear:    avgMonthly * 12,
      savingsRate:      null, // Income not fully integrated yet
      savingsHealth:    null, // Requires targets and consistent tracking
      totalCount:       countAll,
    };
  }

  // ── GROWTH CHART ─────────────────────────────────────────────────────────────
  // Returns cumulative savings data for charting, keyed by period.
  static async getGrowthData(userId: string, range: string) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDate = now.getUTCDate();

    let start: Date;
    const bins: { label: string; start: Date; end: Date }[] = [];

    const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
    const getMonthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1));

    if (range === '7D') {
      start = new Date(Date.UTC(currentYear, currentMonth, currentDate - 6));
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        bins.push({
          label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          start: d,
          end: addDays(d, 1)
        });
      }
    } else if (range === '1M') {
      start = new Date(Date.UTC(currentYear, currentMonth - 1, currentDate));
      const diffDays = Math.ceil((now.getTime() - start.getTime()) / 86400000) + 1;
      for (let i = 0; i < diffDays; i++) {
        const d = addDays(start, i);
        bins.push({
          label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          start: d,
          end: addDays(d, 1)
        });
      }
    } else if (range === '3M') {
      start = new Date(Date.UTC(currentYear, currentMonth - 3, currentDate));
      let current = start;
      while (current <= now) {
        const next = addDays(current, 7);
        bins.push({
          label: current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          start: current,
          end: next
        });
        current = next;
      }
    } else if (range === '6M') {
      start = getMonthStart(currentYear, currentMonth - 5);
      for (let i = 0; i < 6; i++) {
        const d = getMonthStart(start.getUTCFullYear(), start.getUTCMonth() + i);
        bins.push({
          label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          start: d,
          end: getMonthStart(d.getUTCFullYear(), d.getUTCMonth() + 1)
        });
      }
    } else { // 1Y
      start = getMonthStart(currentYear, currentMonth - 11);
      for (let i = 0; i < 12; i++) {
        const d = getMonthStart(start.getUTCFullYear(), start.getUTCMonth() + i);
        bins.push({
          label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          start: d,
          end: getMonthStart(d.getUTCFullYear(), d.getUTCMonth() + 1)
        });
      }
    }

    // 1. Get baseline cumulative total before the start date
    const baseAgg = await prisma.saving.aggregate({
      where: { userId, date: { lt: start } },
      _sum: { amount: true }
    });
    let cumulative = Number(baseAgg._sum.amount ?? 0);

    // 2. Fetch all savings in the active window
    const savings = await prisma.saving.findMany({
      where: { userId, date: { gte: start } },
      select: { date: true, amount: true }
    });

    // 3. Map savings to continuous bins
    const binSums = new Array(bins.length).fill(0);
    savings.forEach(s => {
      const sTime = new Date(s.date).getTime();
      for (let i = 0; i < bins.length; i++) {
        if (sTime >= bins[i].start.getTime() && sTime < bins[i].end.getTime()) {
          binSums[i] += Number(s.amount);
          break;
        }
      }
    });

    // 4. Generate the fully continuous cumulative array
    const result = [];
    for (let i = 0; i < bins.length; i++) {
      cumulative += binSums[i];
      result.push({ name: bins[i].label, saved: cumulative });
    }

    // Fallback: If user has literally 0 savings ever, return a flat line at 0 for the bins
    return result;
  }

  // ── BY-TYPE BREAKDOWN ─────────────────────────────────────────────────────────
  static async getBreakdown(userId: string, month?: number, year?: number) {
    const now = new Date();
    const m   = month ?? now.getMonth() + 1;
    const y   = year  ?? now.getFullYear();

    const start = new Date(Date.UTC(y, m - 1, 1));
    const end   = new Date(Date.UTC(y, m, 1));

    const groups = await prisma.saving.groupBy({
      by:    ['source'],
      where: { userId, date: { gte: start, lt: end } },
      _sum:  { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return groups.map(g => ({
      label:  g.source.charAt(0) + g.source.slice(1).toLowerCase().replace(/_/g, ' '),
      source: g.source,
      impact: Number(g._sum.amount ?? 0),
    }));
  }
}
