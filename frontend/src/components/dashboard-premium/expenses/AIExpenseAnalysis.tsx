import React, { useEffect, useRef, useState } from 'react';
import { getToken } from '../../../utils/auth';

interface AIExpenseAnalysisProps {
  filters?: any;
}

export const AIExpenseAnalysis: React.FC<AIExpenseAnalysisProps> = ({ filters }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        
        const queryParams = new URLSearchParams();
        if (filters?.dateRange) queryParams.append('range', filters.dateRange);
        
        const res = await fetch(`http://localhost:5000/api/expenses/analytics/category-comparison?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const json = await res.json();
        
        if (isMounted) {
          if (json.success) {
            setAnalysis(json.data || json); // Handle data wrapper if any
          } else {
            setError(json.message || 'Failed to fetch analysis');
          }
        }
      } catch (err) {
        if (isMounted) setError('Network error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchAnalysis();
    
    // Add event listener for expense refresh
    const handleRefresh = () => {
      fetchAnalysis();
    };
    
    window.addEventListener('expenseAdded', handleRefresh);
    window.addEventListener('expenseDeleted', handleRefresh);
    window.addEventListener('expenseUpdated', handleRefresh);
    
    return () => {
      isMounted = false;
      window.removeEventListener('expenseAdded', handleRefresh);
      window.removeEventListener('expenseDeleted', handleRefresh);
      window.removeEventListener('expenseUpdated', handleRefresh);
    };
  }, [filters]);

  if (loading && !analysis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Loading analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-negative)', opacity: 0.8 }}>Unable to load spending analysis</p>
      </div>
    );
  }

  if (analysis?.status === 'no_data') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', opacity: 0.8, textAlign: 'center' }}>No spending data yet</p>
      </div>
    );
  }

  if (analysis?.status === 'insufficient_history') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '8px' }}>
          Not enough historical {analysis.category} spending to compare.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Add more expenses to unlock spending comparisons.
        </p>
      </div>
    );
  }

  if (!analysis || analysis.status !== 'success') {
    return null;
  }

  const { category, currentPeriod, comparison, difference, percentageDifference, direction } = analysis;
  
  const formattedPct = Math.round(Math.abs(percentageDifference) * 10) / 10;
  
  let sentence = '';
  if (direction === 'higher') {
    sentence = `Your ${category} spending is ${formattedPct}% higher than your ${comparison.label}.`;
  } else if (direction === 'lower') {
    sentence = `Your ${category} spending is ${formattedPct}% lower than your ${comparison.label}.`;
  } else {
    sentence = `Your ${category} spending is in line with your ${comparison.label}.`;
  }

  // Calculate bar widths relative to the max of current vs comparison to avoid overflow
  const maxVal = Math.max(currentPeriod.amount, comparison.amount) * 1.1 || 1;
  const currentWidth = Math.min((currentPeriod.amount / maxVal) * 100, 100);
  const comparisonWidth = Math.min((comparison.amount / maxVal) * 100, 100);

  const diffSign = direction === 'higher' ? '+' : direction === 'lower' ? '-' : '';
  const diffColor = direction === 'higher' ? 'var(--text-negative)' : direction === 'lower' ? 'var(--text-positive)' : 'var(--text-secondary)';

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
        "{sentence}"
      </p>

      {/* Comparison Bars */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CURRENT</span>
          <span style={{ fontFamily: 'var(--font-primary)' }}>₹{currentPeriod.amount.toLocaleString('en-IN')}</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '12px' }}>
          <div style={{ width: isVisible ? `${currentWidth}%` : '0%', height: '100%', background: diffColor, borderRadius: '2px', transition: 'width 1s ease 0.2s' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AVERAGE</span>
          <span style={{ fontFamily: 'var(--font-primary)' }}>₹{Math.round(comparison.amount).toLocaleString('en-IN')}</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '12px' }}>
          <div style={{ width: isVisible ? `${comparisonWidth}%` : '0%', height: '100%', background: 'var(--text-secondary)', borderRadius: '2px', transition: 'width 1s ease 0.4s' }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>DIFFERENCE</span>
          <span style={{ color: diffColor, fontFamily: 'var(--font-primary)' }}>
            {diffSign}₹{Math.abs(Math.round(difference)).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};
