import React from 'react';
import { AnimatedNumber } from '../dashboard/AnimatedNumber';
import { useDashboard } from '../../context/DashboardContext';

export const GoalList: React.FC = () => {
  const { summary } = useDashboard();
  const goals = summary.data?.goals ?? [];

  const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN');

  if (summary.loading && !summary.data) {
    return (
      <div className="glass-card goals-card anim-fade-up delay-12">
        <h3 className="card-title">FINANCIAL GOALS</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="glass-card goals-card anim-fade-up delay-12">
        <h3 className="card-title">FINANCIAL GOALS</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active goals. Create one to start tracking.</div>
      </div>
    );
  }

  return (
    <div className="glass-card goals-card anim-fade-up delay-12">
      <h3 className="card-title">FINANCIAL GOALS</h3>
      
      <div className="goals-list">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round(goal.progress));
          return (
            <div key={goal.id} className="goal-item">
              <div className="goal-header">
                <span className="goal-name">{goal.name}</span>
                <span className="goal-pct">{pct}%</span>
              </div>
              <div className="goal-amounts">
                <span className="goal-current"><AnimatedNumber value={fmtINR(goal.savedAmount)} trigger={true} /></span>
                <span className="goal-target">/ {fmtINR(goal.targetAmount)}</span>
              </div>
              <div className="goal-bar-bg">
                <div 
                  className="goal-bar-fill svg-draw-progress" 
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
