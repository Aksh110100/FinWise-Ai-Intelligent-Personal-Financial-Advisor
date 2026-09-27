import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../utils/auth';

export const useRoomToSave = () => {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetchRoomToSave = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setData(null);
        return;
      }

      const res    = await fetch('http://localhost:5000/api/expenses/analytics/room-to-save', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // sendSuccess() spreads the service return object into the response body,
      // so all fields (readiness, potentialMonthlySavings, categories, …) sit
      // at the TOP LEVEL of the JSON — not nested under a "data" key.
      const result = await res.json();

      if (res.ok && result.success) {
        // Destructure to omit the envelope fields; keep only domain data.
        const { success, message, ...domainData } = result;
        setData(domainData);
      } else {
        setData(null);
        setError(result.message || 'Failed to fetch savings opportunity');
      }
    } catch (err: any) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoomToSave();
  }, [fetchRoomToSave]);

  return { data, loading, error, refresh: fetchRoomToSave };
};
