import { apiClient } from './client';

export interface DashboardSummary {
  period: {
    range: string;
    start: string;
    end: string;
    label: string;
  };
  income: {
    total: number;
    formatted: string;
    previousPeriod: number | null;
    changePercent: number | null;
  };
  expenses: {
    total: number;
    formatted: string;
    previousPeriod: number | null;
    changePercent: number | null;
  };
  netCashFlow: {
    total: number;
    formatted: string;
  };
  balance: {
    total: number;
    formatted: string;
    source: string;
    note: string;
  };
  savings: {
    total: number;
    formatted: string;
    previousPeriod: number | null;
    changePercent: number | null;
    count: number;
  };
  investments: {
    totalInvested: number;
    currentValue: number;
    returns: number;
    returnPercentage: number | null;
    allocation: { type: string; value: number; percentage: number }[];
    isEmpty: boolean;
  };
  goals: {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    remainingAmount: number;
    progress: number;
    targetDate: string | null;
    status: string;
  }[];
  budgetUtilization: {
    id: string;
    name: string;
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    utilization: number;
    isOverBudget: boolean;
  }[];
  spendingBreakdown: {
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }[];
  safeToSpend: {
    amount: number;
    formatted: string;
  };
  health: {
    score: number;
    label: string;
    breakdown: Record<string, number | null>;
    summary: string;
    factors: string[];
  };
  dataAvailability: {
    hasIncome: boolean;
    hasExpenses: boolean;
    hasSavings: boolean;
    hasInvestments: boolean;
    hasGoals: boolean;
    hasBudgets: boolean;
    hasAccountBalances: boolean;
  };
}

export interface CashFlowPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
}

export interface CashFlowData {
  range: string;
  bucketType: 'day' | 'month';
  points: CashFlowPoint[];
}

export interface SpendingBreakdownData {
  range: string;
  totalExpenses: number;
  categories: {
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }[];
  isEmpty: boolean;
}

export interface DashboardInsight {
  type: string;
  title: string;
  detail?: string;
  metric?: string;
}

export interface InsightsData {
  insights: DashboardInsight[];
  isEmpty: boolean;
  message?: string;
}

export const dashboardApi = {
  async getSummary(range = 'THIS_MONTH'): Promise<DashboardSummary> {
    const { data } = await apiClient.get('/dashboard/summary', { params: { range } });
    return data.data;
  },

  async getCashFlow(range = '1M'): Promise<CashFlowData> {
    const { data } = await apiClient.get('/dashboard/cash-flow', { params: { range } });
    return data.data;
  },

  async getSpendingBreakdown(range = '1M'): Promise<SpendingBreakdownData> {
    const { data } = await apiClient.get('/dashboard/spending-breakdown', { params: { range } });
    return data.data;
  },

  async getInsights(): Promise<InsightsData> {
    const { data } = await apiClient.get('/dashboard/insights');
    return data.data;
  },
};
