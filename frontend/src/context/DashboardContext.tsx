/**
 * DashboardContext — all data sourced from backend API.
 * No mock data, no localStorage financial storage.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  dashboardApi,
  DashboardSummary,
  CashFlowData,
  SpendingBreakdownData,
  InsightsData,
} from '../api/dashboardService';

// ─── State Shapes ─────────────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function initialAsync<T>(): AsyncState<T> {
  return { data: null, loading: false, error: null };
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface DashboardContextType {
  summary: AsyncState<DashboardSummary>;
  cashFlow: AsyncState<CashFlowData>;
  spendingBreakdown: AsyncState<SpendingBreakdownData>;
  insights: AsyncState<InsightsData>;
  cashFlowRange: string;
  summaryRange: string;
  setCashFlowRange: (range: string) => void;
  setSummaryRange: (range: string) => void;
  /** Call after any mutation (add expense, goal, etc.) to refresh dashboard */
  refresh: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [summaryRange, setSummaryRange] = useState('THIS_MONTH');
  const [cashFlowRange, setCashFlowRange] = useState('1M');

  const [summary, setSummary] = useState<AsyncState<DashboardSummary>>(initialAsync());
  const [cashFlow, setCashFlow] = useState<AsyncState<CashFlowData>>(initialAsync());
  const [spendingBreakdown, setSpendingBreakdown] = useState<AsyncState<SpendingBreakdownData>>(initialAsync());
  const [insights, setInsights] = useState<AsyncState<InsightsData>>(initialAsync());

  // Abort stale cash-flow requests when range changes
  const cashFlowAbortRef = useRef<AbortController | null>(null);
  const refreshCountRef = useRef(0);

  // ── Summary fetch ─────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async (range: string) => {
    setSummary(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await dashboardApi.getSummary(range);
      setSummary({ data, loading: false, error: null });
    } catch (err: any) {
      setSummary(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load dashboard summary.',
      }));
    }
  }, []);

  // ── Cash-flow fetch ───────────────────────────────────────────────────────
  const fetchCashFlow = useCallback(async (range: string) => {
    // Cancel previous in-flight request
    if (cashFlowAbortRef.current) {
      cashFlowAbortRef.current.abort();
    }
    cashFlowAbortRef.current = new AbortController();

    setCashFlow(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await dashboardApi.getCashFlow(range);
      setCashFlow({ data, loading: false, error: null });
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.message?.includes('aborted')) return;
      setCashFlow(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load cash flow data.',
      }));
    }
  }, []);

  // ── Spending breakdown fetch ───────────────────────────────────────────────
  const fetchSpendingBreakdown = useCallback(async (range: string) => {
    setSpendingBreakdown(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await dashboardApi.getSpendingBreakdown(range);
      setSpendingBreakdown({ data, loading: false, error: null });
    } catch (err: any) {
      setSpendingBreakdown(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load spending breakdown.',
      }));
    }
  }, []);

  // ── Insights fetch ────────────────────────────────────────────────────────
  const fetchInsights = useCallback(async () => {
    setInsights(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await dashboardApi.getInsights();
      setInsights({ data, loading: false, error: null });
    } catch (err: any) {
      setInsights(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load insights.',
      }));
    }
  }, []);

  // ── Initial load + summary range change ───────────────────────────────────
  useEffect(() => {
    fetchSummary(summaryRange);
  }, [summaryRange, fetchSummary]);

  // ── Cash-flow range change ────────────────────────────────────────────────
  useEffect(() => {
    fetchCashFlow(cashFlowRange);
  }, [cashFlowRange, fetchCashFlow]);

  // ── Spending breakdown synced with summary range ───────────────────────────
  useEffect(() => {
    // Use summary range for spending breakdown (same period)
    const breakdownRange = summaryRange === 'THIS_MONTH' ? '1M' : summaryRange;
    fetchSpendingBreakdown(breakdownRange);
  }, [summaryRange, fetchSpendingBreakdown]);

  // ── Insights – only need to load once per mount / explicit refresh ─────────
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Refresh all on demand ─────────────────────────────────────────────────
  const refresh = useCallback(() => {
    refreshCountRef.current += 1;
    fetchSummary(summaryRange);
    fetchCashFlow(cashFlowRange);
    const breakdownRange = summaryRange === 'THIS_MONTH' ? '1M' : summaryRange;
    fetchSpendingBreakdown(breakdownRange);
    fetchInsights();
  }, [summaryRange, cashFlowRange, fetchSummary, fetchCashFlow, fetchSpendingBreakdown, fetchInsights]);

  return (
    <DashboardContext.Provider
      value={{
        summary,
        cashFlow,
        spendingBreakdown,
        insights,
        cashFlowRange,
        summaryRange,
        setCashFlowRange,
        setSummaryRange,
        refresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
