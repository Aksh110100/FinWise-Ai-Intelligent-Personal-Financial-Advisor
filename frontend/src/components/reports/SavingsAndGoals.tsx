import React, { useEffect, useState } from 'react';
import { useReportContext } from '../../contexts/ReportContext';

export const SavingsAndGoals: React.FC = () => {
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
      <div className="report-two-col savings-goals-grid">
        <div className="report-section-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
          Loading savings progress...
        </div>
        <div className="report-section-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
          Loading goal momentum...
        </div>
      </div>
    );
  }

  const { savingsProgress, goalMomentum } = snapshot;
  
  const percent = Math.round(savingsProgress?.overall || 0);
  
  // Circle math
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="report-two-col savings-goals-grid">
      <div className="report-section-card">
        <h3 className="report-section-title">SAVINGS PROGRESS</h3>
        
        {goalMomentum && goalMomentum.length > 0 ? (
          <>
            <div className="savings-progress-circle-container">
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                <circle 
                  cx="80" cy="80" r={radius} 
                  fill="transparent" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="12" 
                />
                <circle 
                  cx="80" cy="80" r={radius} 
                  fill="transparent" 
                  stroke="var(--text-positive)" 
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={animate ? strokeDashoffset : circumference}
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="savings-circle-text">
                <span className="savings-circle-value">{percent}%</span>
                <span className="savings-circle-label">{savingsProgress?.status || 'In Progress'}</span>
              </div>
            </div>
            
            <div className="savings-remaining">
              Average progress across all active goals
            </div>
          </>
        ) : (
          <div style={{ padding: '2rem 0', color: '#8A8A8A', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No savings goals yet.
          </div>
        )}
      </div>

      <div className="report-section-card">
        <h3 className="report-section-title">GOAL MOMENTUM</h3>
        
        {goalMomentum && goalMomentum.length > 0 ? (
          <div className="goal-momentum-list">
            {goalMomentum.map((goal: any, i: number) => (
              <div key={goal.id} className="goal-momentum-item">
                <div className="goal-momentum-header">
                  <span>{goal.name}</span>
                  <span style={{ color: goal.progress >= 100 ? 'var(--text-positive)' : 'var(--text-secondary)' }}>
                    {Math.round(goal.progress)}%
                  </span>
                </div>
                <div className="expense-cat-bar-bg" style={{ height: '3px' }}>
                  <div 
                    className="expense-cat-bar-fill" 
                    style={{ 
                      width: animate ? `${goal.progress}%` : '0%', 
                      background: goal.progress >= 100 ? 'var(--text-positive)' : 'var(--text-primary)',
                      transitionDelay: `${i * 100 + 200}ms`
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem 0', color: '#8A8A8A', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No active goals.
          </div>
        )}
      </div>
    </div>
  );
};
