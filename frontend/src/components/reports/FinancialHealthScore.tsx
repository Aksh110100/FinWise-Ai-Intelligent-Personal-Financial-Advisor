import React, { useEffect, useState } from 'react';
import { useReportContext } from '../../contexts/ReportContext';

export const FinancialHealthScore: React.FC = () => {
  const { snapshot, loading } = useReportContext();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!loading && snapshot) {
      setAnimate(false);
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, snapshot]);

  if (loading || !snapshot) {
    return (
      <div className="report-section-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
        Loading financial health...
      </div>
    );
  }

  const { financialHealth } = snapshot;
  const score = financialHealth?.score || 0;
  const label = financialHealth?.label || 'Needs Attention';
  const components = financialHealth?.components || {};

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getStatusColor = (status: string) => {
    if (['Strong', 'Good', 'Excellent', 'On Track'].includes(status)) return 'text-emerald';
    if (['Moderate', 'Fair'].includes(status)) return 'text-gold';
    if (['High', 'Needs Attention', 'Low'].includes(status)) return 'text-rose';
    return 'text-secondary';
  };

  return (
    <div className="report-section-card">
      <h3 className="report-section-title">FINANCIAL HEALTH</h3>
      
      <div className="health-score-container">
        
        <div className="health-score-ring">
          <svg className="health-score-svg" viewBox="0 0 220 220">
            <circle 
              cx="110" cy="110" r={radius} 
              fill="transparent" 
              stroke="url(#healthGradient)" 
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={animate ? strokeDashoffset : circumference}
              style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.22, 1, 0.36, 1)' }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C9A46C" />
                <stop offset="100%" stopColor="#63B58A" />
              </linearGradient>
            </defs>
          </svg>
          <span className="health-score-value">{score}</span>
          <span className="health-score-label">{label}</span>
        </div>

        <div className="health-metrics-row">
          <div className="health-metric">
            <span className="health-metric-name">Cash Flow</span>
            <span className={`health-metric-status ${getStatusColor(components.cashFlow)}`}>{components.cashFlow || 'No data'}</span>
          </div>
          <div className="health-metric">
            <span className="health-metric-name">Savings</span>
            <span className={`health-metric-status ${getStatusColor(components.savings)}`}>{components.savings || 'No data'}</span>
          </div>
          <div className="health-metric">
            <span className="health-metric-name">Spending</span>
            <span className={`health-metric-status ${getStatusColor(components.spending)}`}>{components.spending || 'No data'}</span>
          </div>
          <div className="health-metric">
            <span className="health-metric-name">Goals</span>
            <span className={`health-metric-status ${getStatusColor(components.goals)}`}>{components.goals || 'No data'}</span>
          </div>
          <div className="health-metric">
            <span className="health-metric-name">Investments</span>
            <span className={`health-metric-status ${getStatusColor(components.investments)}`}>{components.investments || 'No data'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
