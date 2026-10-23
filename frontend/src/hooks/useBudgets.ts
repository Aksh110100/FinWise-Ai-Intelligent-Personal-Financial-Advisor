import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useBudgets = (filters: any = {}) => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);

      const [listRes, summaryRes, analyticsRes] = await Promise.all([
        apiClient.get(`/budgets?${queryParams.toString()}`),
        apiClient.get(`/budgets/summary?${queryParams.toString()}`),
        apiClient.get(`/budgets/analytics/budget-vs-actual?months=6`)
      ]);

      const listJson = listRes.data;
      const summaryJson = summaryRes.data;
      const analyticsJson = analyticsRes.data;

      if (listJson.success) {
        // Map backend budget format to what frontend expects
        // Frontend expects: category, limit (amount), spent, remaining, period (month), status
        const mappedBudgets = (listJson.data?.data || listJson.data || []).map((b: any) => ({
          id: b.id,
          category: b.Category?.name || 'Uncategorized',
          categoryId: b.categoryId,
          limit: Number(b.amount),
          spent: b.spent,
          remaining: b.remaining,
          percentage: b.percentageUsed,
          status: b.status,
          month: `${new Date(b.year, b.month - 1).toLocaleString('default', { month: 'long' })} ${b.year}`
        }));
        setBudgets(mappedBudgets);
      } else {
        setError(listJson.message || 'Failed to fetch budgets');
      }

      if (summaryJson.success) {
        setSummary(summaryJson);
      }

      if (analyticsJson.success) {
        setAnalytics(analyticsJson.data || []);
      }

    } catch (err: any) {
      console.error('Error fetching budgets:', err);
      setError(err.message || 'Network error while fetching budgets');
    } finally {
      setLoading(false);
    }
  }, [filters.month, filters.year, filters.categoryId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    const handleExpenseChange = () => {
      fetchBudgets();
    };

    window.addEventListener('expenseAdded', handleExpenseChange);
    window.addEventListener('expenseUpdated', handleExpenseChange);
    window.addEventListener('expenseDeleted', handleExpenseChange);

    return () => {
      window.removeEventListener('expenseAdded', handleExpenseChange);
      window.removeEventListener('expenseUpdated', handleExpenseChange);
      window.removeEventListener('expenseDeleted', handleExpenseChange);
    };
  }, [fetchBudgets]);

  const addBudget = async (data: any) => {
    // Map { category, limit, month } to backend { categoryName, amount, month, year }
    const payload: any = {
      categoryName: data.category,
      amount: Number(data.limit),
      notes: data.note
    };

    if (data.month) {
      // Parse "August 2026"
      const parts = data.month.split(' ');
      if (parts.length === 2) {
        const d = new Date(`${parts[0]} 1, ${parts[1]}`);
        payload.month = d.getMonth() + 1;
        payload.year = d.getFullYear();
      }
    } else {
      const now = new Date();
      payload.month = now.getMonth() + 1;
      payload.year = now.getFullYear();
    }

    try {
      const res = await apiClient.post('/budgets', payload);
      if (res.data.success) {
        await fetchBudgets();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add budget');
    }
  };

  const updateBudget = async (id: string, data: any) => {
    try {
      const res = await apiClient.patch(`/budgets/${id}`, data);
      if (res.data.success) {
        await fetchBudgets();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update budget');
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const res = await apiClient.delete(`/budgets/${id}`);
      if (res.data.success) {
        await fetchBudgets();
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  };

  return { budgets, summary, analytics, loading, error, addBudget, updateBudget, deleteBudget, refresh: fetchBudgets };
};
