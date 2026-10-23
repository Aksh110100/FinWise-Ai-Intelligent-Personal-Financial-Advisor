import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useGoals = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/goals');
      const json = res.data;
      
      if (json.success) {
        setGoals(json.data.items || []);
        setError(null);
      } else {
        setError(json.message || 'Failed to fetch goals');
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (data: any) => {
    try {
      const res = await apiClient.post('/goals', data);
      const json = res.data;
      if (json.success) {
        setGoals(prev => [json.data, ...prev]);
        return json.data;
      }
      throw new Error(json.message || 'Failed to create goal');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create goal');
    }
  };

  const updateGoal = async (id: string, data: any) => {
    try {
      const res = await apiClient.patch(`/goals/${id}`, data);
      const json = res.data;
      if (json.success) {
        setGoals(prev => prev.map(g => g.id === id ? json.data : g));
        return json.data;
      }
      throw new Error(json.message || 'Failed to update goal');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update goal');
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const res = await apiClient.delete(`/goals/${id}`);
      const json = res.data;
      if (json.success) {
        setGoals(prev => prev.filter(g => g.id !== id));
        return true;
      }
      throw new Error(json.message || 'Failed to delete goal');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete goal');
    }
  };

  return {
    goals,
    loading,
    error,
    fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal
  };
};

