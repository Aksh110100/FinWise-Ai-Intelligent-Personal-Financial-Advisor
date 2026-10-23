import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

interface ReportContextType {
  snapshot: any | null;
  loading: boolean;
  error: string | null;
  period: string;
  setPeriod: (period: string) => void;
  compare: string;
  setCompare: (compare: string) => void;
  reportType: string;
  setReportType: (type: string) => void;
  fetchReport: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('This Month');
  const [compare, setCompare] = useState<string>('Previous Month');
  const [reportType, setReportType] = useState<string>('Financial Overview');

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/reports/overview', {
        params: { period, comparison: compare }
      });
      if (res.data.success) {
        setSnapshot(res.data.data);
      } else {
        setError(res.data.message || 'Failed to fetch report');
      }
    } catch (err: any) {
      console.error('Failed to fetch report snapshot:', err);
      setError(err.response?.data?.message || 'Unable to load financial report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, compare, reportType]);

  return (
    <ReportContext.Provider value={{ snapshot, loading, error, period, setPeriod, compare, setCompare, reportType, setReportType, fetchReport }}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReportContext = () => {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }
  return context;
};
