import React from 'react';
import { AnimatedNumber } from '../dashboard/AnimatedNumber';
import { useDashboard } from '../../context/DashboardContext';

interface KPICardProps {
  title: string;
  value: string;
  trend: string | null;
  isPositive: boolean;
  delay: string;
  color: string;
}

export const KPIGrid: React.FC = () => {
  const { summary } = useDashboard();
  const data = summary.data;

  function formatTrend(pct: number | null): { label: string; positive: boolean } {
    if (pct === null) return { label: '—', positive: true };
    const sign = pct >= 0 ? '+' : '';
    return { label: `${sign}${pct}%`, positive: pct >= 0 };
  }

  const balanceTrend = formatTrend(data?.income.changePercent ?? null);
  const incomeTrend = formatTrend(data?.income.changePercent ?? null);
  const expenseTrend = formatTrend(data?.expenses.changePercent ?? null);
  const savingsTrend = formatTrend(data?.savings.changePercent ?? null);

  if (summary.loading && !data) {
    return (
      <div className="kpi-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card kpi-card" style={{ opacity: 0.5 }}>
            <div className="kpi-header">
              <h3 className="kpi-title">Loading…</h3>
            </div>
            <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>—</div>
          </div>
        ))}
      </div>
    );
  }

  if (summary.error && !data) {
    return (
      <div className="kpi-grid">
        <div className="glass-card kpi-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ margin: 0 }}>⚠ {summary.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-grid">
      <KPICard
        title="TOTAL BALANCE"
        value={data?.balance.formatted ?? '—'}
        trend={data?.income.changePercent !== undefined ? balanceTrend.label : null}
        isPositive={balanceTrend.positive}
        delay="delay-2"
        color="var(--accent-gold)"
      />
      <KPICard
        title="TOTAL INCOME"
        value={data?.income.formatted ?? '—'}
        trend={incomeTrend.label !== '—' ? incomeTrend.label : null}
        isPositive={incomeTrend.positive}
        delay="delay-3"
        color="var(--text-primary)"
      />
      <KPICard
        title="TOTAL EXPENSES"
        value={data?.expenses.formatted ?? '—'}
        trend={expenseTrend.label !== '—' ? expenseTrend.label : null}
        isPositive={!expenseTrend.positive} // lower expenses = positive health
        delay="delay-4"
        color="var(--text-positive)"
      />
      <KPICard
        title="SAVINGS"
        value={data?.savings.formatted ?? '—'}
        trend={savingsTrend.label !== '—' ? savingsTrend.label : null}
        isPositive={savingsTrend.positive}
        delay="delay-5"
        color="var(--text-secondary)"
      />
    </div>
  );
};

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, isPositive, delay, color }) => {
  return (
    <div className={`glass-card kpi-card anim-fade-up ${delay}`}>
      <div className="kpi-header">
        <h3 className="kpi-title">{title}</h3>
        {trend !== null && (
          <span className={`kpi-trend ${isPositive ? 'trend-up' : 'trend-down'}`}>{trend}</span>
        )}
      </div>
      <div className="kpi-value">
        <AnimatedNumber value={value} trigger={true} duration={1500} />
      </div>
      {/* Sparkline hidden – no fabricated historical data */}
      <div className="kpi-sparkline" style={{ height: '30px' }} />
    </div>
  );
};
