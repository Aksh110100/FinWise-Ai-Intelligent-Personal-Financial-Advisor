import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useRoomToSave = () => {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetchRoomToSave = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get('/expenses/analytics/room-to-save');
      const result = res.data;

      if (result.success) {
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

