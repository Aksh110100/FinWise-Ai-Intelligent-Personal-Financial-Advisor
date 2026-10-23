import React from 'react';
import { useReportContext } from '../../contexts/ReportContext';

export const ReportHero: React.FC = () => {
  const { snapshot, loading, period } = useReportContext();

  const getCashFlowDisplay = () => {
    if (loading || !snapshot) return { val: 'Loading...', color: '' };
    const { netCashFlow } = snapshot.summary;
    const isPos = netCashFlow >= 0;
    return {
      val: `${isPos ? '+' : '-'}₹${Math.abs(Math.round(netCashFlow)).toLocaleString('en-IN')}`,
      color: isPos ? 'text-emerald' : 'text-rose'
    };
  };

  const getSavingsRateDisplay = () => {
    if (loading || !snapshot) return 'Loading...';
    return `${Number(snapshot?.summary?.savingsRate || 0).toFixed(1)}%`;
  };

  const cashFlow = getCashFlowDisplay();

  return (
    <div className="report-hero-section">
      <div className="report-hero-left">
        <span className="report-eyebrow">Financial Intelligence / Reports</span>
        <h1 className="report-hero-title">SEE THE STORY<br />BEHIND YOUR MONEY.</h1>
        <p className="report-hero-subtitle">
          Turn your financial activity into clear, actionable reports designed to help you understand where you stand and where you're heading.
        </p>
      </div>
      
      <div className="report-hero-right">
        <div className="report-summary-indicator">
          <div className="summary-indicator-block">
            <span className="summary-indicator-label">Report Period</span>
            <span className="summary-indicator-value" style={{ fontSize: '0.9rem', marginTop: '6px' }}>{period.toUpperCase()}</span>
          </div>
          <div className="summary-indicator-block">
            <span className="summary-indicator-label">Net Cash Flow</span>
            <span className={`summary-indicator-value ${cashFlow.color}`}>{cashFlow.val}</span>
          </div>
          <div className="summary-indicator-block">
            <span className="summary-indicator-label">Savings Rate</span>
            <span className="summary-indicator-value">{getSavingsRateDisplay()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
