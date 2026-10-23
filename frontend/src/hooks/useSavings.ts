import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useSavings = (filters: any = {}) => {
  const [savings, setSavings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavings = useCallback(async () => {
    // Basic cancel token mechanism for React StrictMode or rapid filter clicking
    const reqId = Date.now() + Math.random();
    (fetchSavings as any)._reqId = reqId;

    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.type && filters.type !== 'ALL') queryParams.append('type', filters.type);

      const [listRes, summaryRes, growthRes, breakdownRes] = await Promise.all([
        apiClient.get(`/savings?${queryParams.toString()}`),
        apiClient.get(`/savings/summary?${queryParams.toString()}`),
        apiClient.get(`/savings/growth?range=${filters.range || '6M'}`),
        apiClient.get(`/savings/breakdown?${queryParams.toString()}`)
      ]);

      if ((fetchSavings as any)._reqId !== reqId) return; // Stale request

      const listJson = listRes.data;
      const summaryJson = summaryRes.data;
      const growthJson = growthRes.data;
      const breakdownJson = breakdownRes.data;

      if (listJson.success) {
        setSavings(listJson.data || []);
      } else {
        setError(listJson.message || 'Failed to fetch savings');
      }

      if (summaryJson.success) {
        setSummary(summaryJson);
      }

      if (growthJson.success) {
        setGrowth(growthJson.data || []);
      }

      if (breakdownJson.success) {
        setBreakdown(breakdownJson.data || []);
      }

    } catch (err: any) {
      if ((fetchSavings as any)._reqId !== reqId) return; // Stale request
      console.error('Error fetching savings:', err);
      // Don't overwrite useful API errors with a generic network error
      setError(err.message || 'Network error while fetching savings');
    } finally {
      if ((fetchSavings as any)._reqId === reqId) {
        setLoading(false);
      }
    }
  }, [filters.month, filters.year, filters.range]);

  useEffect(() => {
    fetchSavings();
    return () => { (fetchSavings as any)._reqId = null; };
  }, [fetchSavings]);

  const addSaving = async (data: any) => {
    try {
      const res = await apiClient.post('/savings', data);
      if (res.data.success) {
        await fetchSavings();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add saving');
    }
  };

  const updateSaving = async (id: string, data: any) => {
    try {
      const res = await apiClient.patch(`/savings/${id}`, data);
      if (res.data.success) {
        await fetchSavings();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update saving');
    }
  };

  const deleteSaving = async (id: string) => {
    try {
      const res = await apiClient.delete(`/savings/${id}`);
      if (res.data.success) {
        await fetchSavings();
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  };

  return { savings, summary, growth, breakdown, loading, error, addSaving, updateSaving, deleteSaving, refresh: fetchSavings };
};
