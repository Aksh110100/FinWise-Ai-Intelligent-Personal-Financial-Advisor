import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useReportContext } from '../../contexts/ReportContext';

export const ReportSnapshot: React.FC = () => {
  const { snapshot, loading } = useReportContext();

  if (loading || !snapshot) {
    return (
      <div className="report-snapshot-container">
        <h3 className="report-section-title" style={{ marginBottom: '16px' }}>YOUR FINANCIAL SNAPSHOT</h3>
        <div style={{ color: '#8A8A8A' }}>Loading snapshot...</div>
      </div>
    );
  }

  const { summary, changes } = snapshot;

  const formatCurrency = (amount: number) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const renderTrend = (change: number, invertColors = false) => {
    const safeChange = Number(change || 0);
    if (Math.abs(safeChange) < 0.1) {
      return (
        <div className="metric-block-trend trend-neutral">
          <Minus size={14} /> 0% from comparison period
        </div>
      );
    }
    const isPositive = safeChange > 0;
    const isGood = invertColors ? !isPositive : isPositive;
    return (
      <div className={`metric-block-trend ${isGood ? 'trend-positive' : 'trend-negative'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(safeChange).toFixed(1)}% from comparison period
      </div>
    );
  };

  return (
    <div className="report-snapshot-container">
      <h3 className="report-section-title" style={{ marginBottom: '16px' }}>YOUR FINANCIAL SNAPSHOT</h3>
      
      <div className="report-snapshot-grid">
        <div className="report-metric-block">
          <span className="metric-block-label">NET INCOME</span>
          <span className="metric-block-value">{formatCurrency(summary.netIncome)}</span>
          {renderTrend(changes.netIncome)}
        </div>

        <div className="report-metric-block">
          <span className="metric-block-label">TOTAL EXPENSES</span>
          <span className="metric-block-value">{formatCurrency(summary.totalExpenses)}</span>
          {renderTrend(changes.totalExpenses, true)}
        </div>

        <div className="report-metric-block">
          <span className="metric-block-label">SAVINGS</span>
          <span className="metric-block-value">{formatCurrency(summary.savings)}</span>
          {renderTrend(changes.savings)}
        </div>

        <div className="report-metric-block">
          <span className="metric-block-label">SAVINGS RATE</span>
          <span className="metric-block-value">{Number(summary?.savingsRate || 0).toFixed(1)}%</span>
          {renderTrend(changes.savingsRate)}
        </div>
      </div>
    </div>
  );
};
