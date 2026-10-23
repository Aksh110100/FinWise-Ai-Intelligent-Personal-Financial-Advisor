import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export const SpendingDonut: React.FC = () => {
  const { spendingBreakdown } = useDashboard();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = spendingBreakdown.data;
  const categories = data?.categories ?? [];
  const totalExpenses = data?.totalExpenses ?? 0;
  const fmtTotal = '₹' + totalExpenses.toLocaleString('en-IN');

  if (spendingBreakdown.loading && !data) {
    return (
      <div className="glass-card donut-card anim-fade-up delay-7">
        <h3 className="card-title">SPENDING BREAKDOWN</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    );
  }

  if (data?.isEmpty || categories.length === 0) {
    return (
      <div className="glass-card donut-card anim-fade-up delay-7">
        <h3 className="card-title">SPENDING BREAKDOWN</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No expenses recorded this period.</div>
      </div>
    );
  }

  // Calculate SVG stroke-dasharray for donut segments
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const colors = [
    'var(--accent-gold)',
    'var(--text-positive)',
    '#a0aab5',
    '#4a5568',
    '#2d3748',
    'var(--text-secondary)',
  ];

  const segments = categories.map((cat, idx) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (cat.percentage / 100) * circumference;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
      color: colors[idx % colors.length],
    };
  });

  const displayCat = hoveredIdx !== null ? categories[hoveredIdx] : null;

  return (
    <div className="glass-card donut-card anim-fade-up delay-7">
      <h3 className="card-title">SPENDING BREAKDOWN</h3>

      <div className="donut-container">
        <div className="donut-chart-wrapper">
          <svg viewBox="0 0 240 240" className="donut-svg">
            <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
            {segments.map((seg, idx) => (
              <circle
                key={idx}
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredIdx === idx ? '24' : '20'}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                className="donut-segment svg-draw-circle"
                style={{ transition: 'stroke-width 0.3s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>
          <div className="donut-center-text">
            <span className="donut-amount">
              {displayCat ? '₹' + displayCat.amount.toLocaleString('en-IN') : fmtTotal}
            </span>
            <span className="donut-label">
              {displayCat ? displayCat.categoryName : 'TOTAL SPENDING'}
            </span>
          </div>
        </div>

        <div className="donut-legend">
          {segments.map((seg, idx) => (
            <div
              key={idx}
              className={`legend-item ${hoveredIdx === idx ? 'active' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="legend-color" style={{ backgroundColor: seg.color }}></div>
              <span className="legend-name">{seg.categoryName}</span>
              <span className="legend-pct">{seg.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
