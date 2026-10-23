import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useExpenses = (filters: any) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category && filters.category !== 'All categories') queryParams.append('categoryName', filters.category);
      if (filters.paymentMethod && filters.paymentMethod !== 'All') queryParams.append('paymentMethod', filters.paymentMethod);
      
      // Handle Date Ranges
      const now = new Date();
      let start = new Date();
      
      switch (filters.dateRange) {
        case '7D':
          start.setDate(now.getDate() - 7);
          break;
        case '1M':
          start.setMonth(now.getMonth() - 1);
          break;
        case '3M':
          start.setMonth(now.getMonth() - 3);
          break;
        case '6M':
          start.setMonth(now.getMonth() - 6);
          break;
        case '1Y':
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setMonth(now.getMonth() - 1); // fallback
          break;
      }
      
      queryParams.append('from', start.toISOString());
      queryParams.append('to', now.toISOString());

      const [listRes, summaryRes] = await Promise.all([
        apiClient.get(`/expenses?${queryParams.toString()}`),
        apiClient.get(`/expenses/summary?${queryParams.toString()}`)
      ]);

      const listData = listRes.data;
      const summaryData = summaryRes.data;

      if (listData.success) setExpenses(listData.items || []);
      if (summaryData.success) setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (data: any) => {
    try {
      const res = await apiClient.post('/expenses', {
        amount: data.amount,
        categoryName: data.category,
        date: data.date,
        paymentMethod: data.method === 'Bank Transfer' ? 'BANK_TRANSFER' : (data.method === 'Card' ? 'CREDIT_CARD' : data.method.toUpperCase()),
        notes: data.note
      });
      
      if (res.data.success) {
        await fetchExpenses();
        window.dispatchEvent(new Event('expenseAdded'));
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add expense');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const res = await apiClient.delete(`/expenses/${id}`);
      if (res.data.success) {
        await fetchExpenses();
        window.dispatchEvent(new Event('expenseDeleted'));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  return { expenses, summary, loading, error, addExpense, deleteExpense, refresh: fetchExpenses };
};
