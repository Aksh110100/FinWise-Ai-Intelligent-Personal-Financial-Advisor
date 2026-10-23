import React from 'react';
import { AnimatedNumber } from '../dashboard/AnimatedNumber';
import { useDashboard } from '../../context/DashboardContext';

export const FinancialHealth: React.FC = () => {
  const { summary } = useDashboard();
  const health = summary.data?.health;

  const score = health?.score ?? 0;
  const label = health?.label ?? '—';
  const factors = health?.factors ?? [];
  const breakdown = health?.breakdown ?? {};

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  if (summary.loading && !summary.data) {
    return (
      <div className="glass-card health-card anim-fade-up delay-8">
        <h3 className="card-title">FINANCIAL HEALTH</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    );
  }

  // Derive health bar values from breakdown
  const barData = [
    { label: 'Spending', score: breakdown.spending },
    { label: 'Saving', score: breakdown.savings },
    { label: 'Investing', score: breakdown.investments },
    { label: 'Budget', score: breakdown.budgetAdherence },
  ];

  return (
    <div className="glass-card health-card anim-fade-up delay-8">
      <h3 className="card-title">FINANCIAL HEALTH</h3>
      
      <div className="health-content">
        <div className="health-ring-container">
          <svg viewBox="0 0 160 160" className="health-svg">
            {/* Background ring */}
            <circle 
              cx="80" cy="80" r={radius} 
              fill="none" 
              stroke="rgba(255,255,255,0.05)" 
              strokeWidth="12" 
            />
            {/* Active ring */}
            <circle 
              cx="80" cy="80" r={radius} 
              fill="none" 
              stroke="url(#healthGrad)" 
              strokeWidth="12" 
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: offset }}
              className="svg-draw-health"
              transform="rotate(-90 80 80)"
            />
            <defs>
              <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-gold)" />
                <stop offset="100%" stopColor="var(--text-positive)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="health-score-text">
            <span className="health-num"><AnimatedNumber value={score.toString()} trigger={true} duration={2000} /></span>
            <span className="health-status">{label}</span>
          </div>
        </div>

        <div className="health-bars">
          {barData.map(item => (
            <HealthBar key={item.label} label={item.label} active={item.score !== null && item.score !== undefined ? Math.round(item.score / 10) : 0} />
          ))}
        </div>
      </div>

      {factors.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {factors.slice(0, 3).map((f, i) => (
            <div key={i}>• {f}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const HealthBar: React.FC<{ label: string, active: number }> = ({ label, active }) => {
  const total = 10;
  return (
    <div className="health-bar-row">
      <span className="health-bar-label">{label}</span>
      <div className="health-blocks">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-block ${i < active ? 'active' : ''}`}>█</span>
        ))}
      </div>
    </div>
  );
};
