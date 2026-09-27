import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../utils/auth';

export const useBudgets = (filters: any = {}) => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      const queryParams = new URLSearchParams();
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);

      const [listRes, summaryRes, analyticsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/budgets?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/budgets/summary?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/budgets/analytics/budget-vs-actual?months=6`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const [listJson, summaryJson, analyticsJson] = await Promise.all([
        listRes.json(),
        summaryRes.json(),
        analyticsRes.json()
      ]);

      if (listRes.ok && listJson.success) {
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

      if (summaryRes.ok && summaryJson.success) {
        setSummary(summaryJson);
      }

      if (analyticsRes.ok && analyticsJson.success) {
        setAnalytics(analyticsJson.data || []);
      }

    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Network error while fetching budgets');
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

    const token = getToken();
    const res = await fetch('http://localhost:5000/api/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      await fetchBudgets();
      return true;
    } else {
      const json = await res.json();
      throw new Error(json.message || 'Failed to add budget');
    }
  };

  const updateBudget = async (id: string, data: any) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/budgets/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      await fetchBudgets();
      return true;
    } else {
      const json = await res.json();
      throw new Error(json.message || 'Failed to update budget');
    }
  };

  const deleteBudget = async (id: string) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/budgets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      await fetchBudgets();
      return true;
    }
    return false;
  };

  return { budgets, summary, analytics, loading, error, addBudget, updateBudget, deleteBudget, refresh: fetchBudgets };
};
