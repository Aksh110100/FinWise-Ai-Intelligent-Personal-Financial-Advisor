import { PrismaClient, InvestmentType } from '@prisma/client';
import { Prisma } from '@prisma/client';


const prisma = new PrismaClient();

export class InvestmentService {
  async getInvestments(userId: string) {
    return prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getInvestmentById(userId: string, id: string) {
    const inv = await prisma.investment.findFirst({
      where: { id, userId }
    });
    if (!inv) throw new Error('Investment not found');
    return inv;
  }

  async createInvestment(userId: string, data: any) {
    return prisma.investment.create({
      data: {
        userId,
        name: data.name,
        symbol: data.symbol,
        type: data.type as InvestmentType,
        investedAmount: new Prisma.Decimal(data.investedAmount),
        quantity: data.quantity ? new Prisma.Decimal(data.quantity) : null,
        purchasePrice: data.purchasePrice ? new Prisma.Decimal(data.purchasePrice) : null,
        currentValue: data.currentValue ? new Prisma.Decimal(data.currentValue) : new Prisma.Decimal(data.investedAmount),
        currentPrice: data.currentPrice ? new Prisma.Decimal(data.currentPrice) : (data.purchasePrice ? new Prisma.Decimal(data.purchasePrice) : null),
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        notes: data.notes
      }
    });
  }

  async updateInvestment(userId: string, id: string, data: any) {
    const inv = await this.getInvestmentById(userId, id);
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.symbol !== undefined) updateData.symbol = data.symbol;
    if (data.type !== undefined) updateData.type = data.type as InvestmentType;
    if (data.investedAmount !== undefined) updateData.investedAmount = new Prisma.Decimal(data.investedAmount);
    if (data.quantity !== undefined) updateData.quantity = data.quantity ? new Prisma.Decimal(data.quantity) : null;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice ? new Prisma.Decimal(data.purchasePrice) : null;
    if (data.currentValue !== undefined) updateData.currentValue = data.currentValue ? new Prisma.Decimal(data.currentValue) : null;
    if (data.currentPrice !== undefined) updateData.currentPrice = data.currentPrice ? new Prisma.Decimal(data.currentPrice) : null;
    if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Optional: Recalculate currentValue if quantity and currentPrice are provided
    if (data.quantity && data.currentPrice) {
      updateData.currentValue = new Prisma.Decimal(Number(data.quantity) * Number(data.currentPrice));
    }

    return prisma.investment.update({
      where: { id },
      data: updateData
    });
  }

  async deleteInvestment(userId: string, id: string) {
    await this.getInvestmentById(userId, id);
    await prisma.investment.delete({ where: { id } });
    return { success: true };
  }

  async getSummary(userId: string) {
    const investments = await this.getInvestments(userId);
    if (investments.length === 0) {
      return { totalInvested: 0, currentValue: 0, totalReturns: 0, returnPercentage: 0, isEmpty: true };
    }

    let totalInvested = 0;
    let currentPortfolioValue = 0;

    investments.forEach(inv => {
      totalInvested += Number(inv.investedAmount);
      currentPortfolioValue += inv.currentValue ? Number(inv.currentValue) : Number(inv.investedAmount);
    });

    const totalReturns = currentPortfolioValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue: currentPortfolioValue,
      totalReturns,
      returnPercentage: returnPercentage.toFixed(2),
      isEmpty: false
    };
  }

  async getAllocation(userId: string) {
    const investments = await this.getInvestments(userId);
    if (investments.length === 0) return [];

    let currentPortfolioValue = 0;
    const allocMap: Record<string, number> = {};

    investments.forEach(inv => {
      const val = inv.currentValue ? Number(inv.currentValue) : Number(inv.investedAmount);
      currentPortfolioValue += val;
      if (!allocMap[inv.type]) allocMap[inv.type] = 0;
      allocMap[inv.type] += val;
    });

    if (currentPortfolioValue === 0) return [];

    const result = Object.keys(allocMap).map(type => {
      const val = allocMap[type];
      const pct = (val / currentPortfolioValue) * 100;
      return {
        assetType: type,
        currentValue: val,
        percentageOfPortfolio: Number(pct.toFixed(2))
      };
    });

    return result.sort((a, b) => b.percentageOfPortfolio - a.percentageOfPortfolio);
  }

  async getPerformance(userId: string, range: string) {
    // Get historical portfolio snapshots
    let startDate = new Date();
    if (range === '1M') startDate.setMonth(startDate.getMonth() - 1);
    else if (range === '3M') startDate.setMonth(startDate.getMonth() - 3);
    else if (range === '6M') startDate.setMonth(startDate.getMonth() - 6);
    else if (range === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate = new Date(0); // ALL

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { 
        userId,
        snapshotDate: { gte: startDate }
      },
      orderBy: { snapshotDate: 'asc' }
    });

    // Deduplicate by calendar day, keeping only the latest snapshot of each day
    const dailyMap = new Map<string, any>();
    for (const snap of snapshots) {
      const dateKey = snap.snapshotDate.toISOString().split('T')[0];
      dailyMap.set(dateKey, snap);
    }

    return Array.from(dailyMap.values());
  }
  
  async createSnapshot(userId: string) {
    const summary = await this.getSummary(userId);
    if (summary.isEmpty) return null;
    
    return prisma.portfolioSnapshot.create({
      data: {
        userId,
        totalInvested: new Prisma.Decimal(summary.totalInvested),
        currentPortfolioValue: new Prisma.Decimal(summary.currentValue),
        totalReturns: new Prisma.Decimal(summary.totalReturns),
        returnPercentage: new Prisma.Decimal(summary.returnPercentage)
      }
    });
  }

  // Plans
  async getPlans(userId: string) {
    return prisma.investmentPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createPlan(userId: string, data: any) {
    return prisma.investmentPlan.create({
      data: {
        userId,
        name: data.name,
        assetType: data.assetType as InvestmentType,
        plannedAmount: new Prisma.Decimal(data.plannedAmount),
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        contributionFreq: data.contributionFreq,
        notes: data.notes
      }
    });
  }
  
  async getReview(userId: string) {
     const summary = await this.getSummary(userId);
     const allocation = await this.getAllocation(userId);
     const investments = await this.getInvestments(userId);
     
     // basic deterministic insights
     const topHoldings = [...investments].sort((a, b) => {
        const valA = a.currentValue ? Number(a.currentValue) : Number(a.investedAmount);
        const valB = b.currentValue ? Number(b.currentValue) : Number(b.investedAmount);
        return valB - valA;
     }).slice(0, 3);
     
     const hasMissingPrices = investments.some(i => i.currentValue === null);
     const hasHistorical = await prisma.portfolioSnapshot.count({ where: { userId } }) > 0;
     
     return {
       summary,
       allocation,
       topHoldings,
       hasMissingPrices,
       hasHistorical,
       insights: "Portfolio reviewed successfully based on verified data. Consider tracking snapshot history to evaluate long-term trends."
     };
  }
}

export const investmentService = new InvestmentService();
