import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../utils/auth';

export const useSavings = (filters: any = {}) => {
  const [savings, setSavings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavings = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      const queryParams = new URLSearchParams();
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.type && filters.type !== 'ALL') queryParams.append('type', filters.type);

      const [listRes, summaryRes, growthRes, breakdownRes] = await Promise.all([
        fetch(`http://localhost:5000/api/savings?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/savings/summary?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/savings/growth?range=${filters.range || '6M'}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/savings/breakdown?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const [listJson, summaryJson, growthJson, breakdownJson] = await Promise.all([
        listRes.json(),
        summaryRes.json(),
        growthRes.json(),
        breakdownRes.json()
      ]);

      if (listRes.ok && listJson.success) {
        setSavings(listJson.data || []);
      } else {
        setError(listJson.message || 'Failed to fetch savings');
      }

      if (summaryRes.ok && summaryJson.success) {
        setSummary(summaryJson);
      }

      if (growthRes.ok && growthJson.success) {
        setGrowth(growthJson.data || []);
      }

      if (breakdownRes.ok && breakdownJson.success) {
        setBreakdown(breakdownJson.data || []);
      }

    } catch (err) {
      console.error('Error fetching savings:', err);
      setError('Network error while fetching savings');
    } finally {
      setLoading(false);
    }
  }, [filters.month, filters.year, filters.range]);

  useEffect(() => {
    fetchSavings();
  }, [fetchSavings]);

  const addSaving = async (data: any) => {
    const token = getToken();
    const res = await fetch('http://localhost:5000/api/savings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      await fetchSavings();
      return true;
    } else {
      const json = await res.json();
      throw new Error(json.message || 'Failed to add saving');
    }
  };

  const updateSaving = async (id: string, data: any) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/savings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      await fetchSavings();
      return true;
    } else {
      const json = await res.json();
      throw new Error(json.message || 'Failed to update saving');
    }
  };

  const deleteSaving = async (id: string) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/savings/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      await fetchSavings();
      return true;
    }
    return false;
  };

  return { savings, summary, growth, breakdown, loading, error, addSaving, updateSaving, deleteSaving, refresh: fetchSavings };
};
