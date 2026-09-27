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
  // Returns cumulative or monthly savings data for charting, keyed by period.
  static async getGrowthData(userId: string, range: string) {
    const now = new Date();

    let start: Date;
    let groupByMonth = false;

    switch (range) {
      case '7D':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
        break;
      case '1M':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        break;
      case '3M':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
        groupByMonth = true;
        break;
      case '6M':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
        groupByMonth = true;
        break;
      case '1Y':
      default:
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
        groupByMonth = true;
        break;
    }

    const savings = await prisma.saving.findMany({
      where:   { userId, date: { gte: start } },
      orderBy: { date: 'asc' },
      select:  { date: true, amount: true },
    });

    if (savings.length === 0) return [];

    if (!groupByMonth) {
      // Daily aggregation
      const dayMap = new Map<string, number>();
      savings.forEach(s => {
        const key = s.date.toISOString().slice(0, 10);
        dayMap.set(key, (dayMap.get(key) ?? 0) + Number(s.amount));
      });
      // Build cumulative
      let cumulative = 0;
      return Array.from(dayMap.entries()).map(([date, amt]) => {
        cumulative += amt;
        return { name: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }), saved: cumulative };
      });
    } else {
      // Monthly aggregation
      const monthMap = new Map<string, number>();
      savings.forEach(s => {
        const key = `${s.date.getUTCFullYear()}-${String(s.date.getUTCMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, (monthMap.get(key) ?? 0) + Number(s.amount));
      });
      // Build cumulative in chronological order
      let cumulative = 0;
      return Array.from(monthMap.entries())
        .sort()
        .map(([key, amt]) => {
          cumulative += amt;
          const [yr, mo] = key.split('-').map(Number);
          const label = new Date(yr, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: range === '1Y' ? undefined : '2-digit' });
          return { name: label, saved: cumulative };
        });
    }
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
