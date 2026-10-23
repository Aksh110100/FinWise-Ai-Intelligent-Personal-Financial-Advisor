import React from 'react';
import { AnimatedNumber } from '../dashboard/AnimatedNumber';
import { useDashboard } from '../../context/DashboardContext';

export const InvestmentOverview: React.FC = () => {
  const { summary } = useDashboard();
  const inv = summary.data?.investments;

  const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN');

  if (summary.loading && !summary.data) {
    return (
      <div className="glass-card inv-card anim-fade-up delay-11">
        <h3 className="card-title">INVESTMENT OVERVIEW</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    );
  }

  if (!inv || inv.isEmpty) {
    return (
      <div className="glass-card inv-card anim-fade-up delay-11">
        <h3 className="card-title">INVESTMENT OVERVIEW</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No investments tracked yet.</div>
      </div>
    );
  }

  const returnsPositive = inv.returns >= 0;
  const retSign = returnsPositive ? '+' : '';

  return (
    <div className="glass-card inv-card anim-fade-up delay-11">
      <h3 className="card-title">INVESTMENT OVERVIEW</h3>
      
      <div className="inv-stats">
        <div className="inv-stat">
          <span className="inv-label">Current</span>
          <span className="inv-val"><AnimatedNumber value={fmtINR(inv.currentValue)} trigger={true} /></span>
        </div>
        <div className="inv-stat">
          <span className="inv-label">Returns</span>
          <span className={`inv-val ${returnsPositive ? 'positive' : ''}`}>{retSign}{fmtINR(inv.returns)}</span>
        </div>
        <div className="inv-stat">
          <span className="inv-label">Return %</span>
          <span className={`inv-val ${returnsPositive ? 'positive' : ''}`}>
            {inv.returnPercentage !== null ? `${retSign}${inv.returnPercentage}%` : '—'}
          </span>
        </div>
      </div>

      {inv.allocation.length > 0 && (
        <div className="inv-portfolio">
          <h4 className="portfolio-title">PORTFOLIO</h4>
          <div className="portfolio-bars">
            {inv.allocation.map((item, idx) => {
              const barColors = [
                'var(--text-primary)',
                'var(--text-secondary)',
                'var(--accent-gold)',
                'var(--text-positive)',
                '#a0aab5',
                '#4a5568',
              ];
              return (
                <div key={idx} className="p-bar-item">
                  <span>{item.type} ({item.percentage}%)</span>
                  <div className="p-bar-bg">
                    <div
                      className="p-bar-fill svg-draw-progress"
                      style={{ width: `${item.percentage}%`, backgroundColor: barColors[idx % barColors.length] }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
