import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReportContext } from '../../contexts/ReportContext';

export const ExpenseDistribution: React.FC = () => {
  const { snapshot, loading } = useReportContext();
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && snapshot) {
      setAnimate(false);
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, snapshot]);

  if (loading || !snapshot) {
    return (
      <div className="report-two-col">
        <div className="report-section-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
          Loading expenses...
        </div>
        <div className="report-section-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
          Loading signal...
        </div>
      </div>
    );
  }

  const categories = snapshot.spendingByCategory || [];
  const spendingSignal = snapshot.spendingSignal || 'Not enough data for spending signal.';

  return (
    <div className="report-two-col">
      <div className="report-section-card">
        <h3 className="report-section-title">WHERE YOUR MONEY WENT</h3>
        
        {categories.length === 0 ? (
          <div style={{ padding: '2rem 0', color: '#8A8A8A', textAlign: 'center' }}>
            No expenses recorded.
          </div>
        ) : (
          <div className="expense-cat-list">
            {categories.map((cat: any, i: number) => (
              <div key={cat.category} className="expense-cat-item">
                <div className="expense-cat-header">
                  <span>{cat.category}</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span className="expense-cat-value">₹{Math.round(cat.amount).toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--text-primary)', width: '40px', textAlign: 'right' }}>{Number(cat?.percentage || 0).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="expense-cat-bar-bg">
                  <div 
                    className="expense-cat-bar-fill" 
                    style={{ 
                      width: animate ? `${cat.percentage}%` : '0%',
                      transitionDelay: `${i * 100}ms`
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="report-section-card highlight-card">
        <h3 className="report-section-title" style={{ color: 'var(--text-primary)' }}>SPENDING SIGNAL</h3>
        <p className="highlight-text">
          {spendingSignal}
        </p>
        
        <button className="btn-secondary mt-4" onClick={() => navigate('/expenses')}>
          VIEW EXPENSES <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
