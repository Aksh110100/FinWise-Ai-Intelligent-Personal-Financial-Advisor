import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../utils/auth';

export const useExpenses = (filters: any) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      
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
        fetch(`http://localhost:5000/api/expenses?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/expenses/summary?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const listData = await listRes.json();
      const summaryData = await summaryRes.json();

      if (listData.success) setExpenses(listData.items || []);
      if (summaryData.success) setSummary(summaryData);
    } catch (err) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (data: any) => {
    const token = getToken();
    const res = await fetch('http://localhost:5000/api/expenses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        amount: data.amount,
        categoryName: data.category,
        date: data.date,
        paymentMethod: data.method === 'Bank Transfer' ? 'BANK_TRANSFER' : (data.method === 'Card' ? 'CREDIT_CARD' : data.method.toUpperCase()),
        notes: data.note
      })
    });
    
    if (res.ok) {
      await fetchExpenses();
      window.dispatchEvent(new Event('expenseAdded'));
      return true;
    }
    return false;
  };

  const deleteExpense = async (id: string) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      await fetchExpenses();
      window.dispatchEvent(new Event('expenseDeleted'));
      return true;
    }
    return false;
  };

  return { expenses, summary, loading, error, addExpense, deleteExpense, refresh: fetchExpenses };
};
