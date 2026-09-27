import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../utils/auth';

export const useGoals = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch(`http://localhost:5000/api/goals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
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
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/goals`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    
    const json = await res.json();
    if (res.ok && json.success) {
      setGoals(prev => [json.data, ...prev]);
      return json.data;
    }
    throw new Error(json.message || 'Failed to create goal');
  };

  const updateGoal = async (id: string, data: any) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    
    const json = await res.json();
    if (res.ok && json.success) {
      setGoals(prev => prev.map(g => g.id === id ? json.data : g));
      return json.data;
    }
    throw new Error(json.message || 'Failed to update goal');
  };

  const deleteGoal = async (id: string) => {
    const token = getToken();
    const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const json = await res.json();
    if (res.ok && json.success) {
      setGoals(prev => prev.filter(g => g.id !== id));
      return true;
    }
    throw new Error(json.message || 'Failed to delete goal');
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
