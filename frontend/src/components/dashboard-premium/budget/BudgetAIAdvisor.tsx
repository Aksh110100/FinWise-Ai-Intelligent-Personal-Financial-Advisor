import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useRoomToSave } from '../../../hooks/useRoomToSave';

interface BudgetAIAdvisorProps {
  onOptimize?: () => void;
}

export const BudgetAIAdvisor: React.FC<BudgetAIAdvisorProps> = ({ onOptimize }) => {
  return (
    <div className="budget-glass-panel" style={{ border: '1px solid rgba(201, 164, 108, 0.2)', background: 'rgba(201, 164, 108, 0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Sparkles size={16} color="var(--accent-gold)" />
        <span style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em' }}>FINWISE AI</span>
      </div>
      
      <h3 style={{ fontFamily: 'var(--font-secondary)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '0.05em' }}>
        BUDGET SIGNAL
      </h3>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
        "You're on track overall, but your shopping budget is running 20% above your usual pace."
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>PROJECTED MONTH-END</div>
          <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>₹7,200</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>BUDGET</div>
          <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>₹6,000</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>POTENTIAL OVERSPEND</div>
          <div style={{ fontSize: '1.25rem', color: '#C46C6C', fontWeight: 600 }}>₹1,200</div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.1em' }}>
          AI SUGGESTION
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
          "Reducing shopping by approximately ₹300 per week would keep you within your monthly target."
        </p>
      </div>

      <button className="ai-action-btn" onClick={onOptimize}>
        OPTIMIZE BUDGET <ArrowRight size={16} />
      </button>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ROOM TO SAVE — 4-level data-readiness system
// Backend determines the level; frontend only renders.
// ════════════════════════════════════════════════════════════════════════════
export const RoomToSave: React.FC = () => {
  const navigate  = useNavigate();
  const { data, loading, error, refresh } = useRoomToSave();

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  const headerStyle: React.CSSProperties = {
    fontFamily:    'var(--font-secondary)',
    fontSize:      '0.85rem',
    letterSpacing: '0.1em',
    color:         'var(--text-secondary)',
    marginBottom:  '12px',
  };

  const hintStyle: React.CSSProperties = {
    fontSize:     '0.8rem',
    color:        'var(--text-muted)',
    lineHeight:   '1.5',
    marginBottom: '16px',
  };

  const linkBtnStyle: React.CSSProperties = {
    background:    'transparent',
    border:        'none',
    color:         'var(--accent-gold)',
    fontSize:      '0.85rem',
    fontWeight:    600,
    display:       'flex',
    alignItems:    'center',
    gap:           '4px',
    cursor:        'pointer',
    padding:       0,
    letterSpacing: '0.05em',
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="budget-glass-panel">
        <h4 style={headerStyle}>ROOM TO SAVE</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Loader2 size={15} color="var(--accent-gold)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating…</span>
        </div>
        <div style={{ height: '28px', width: '90px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', animation: 'rts-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '10px', width: '140px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', animation: 'rts-pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="budget-glass-panel">
        <h4 style={headerStyle}>ROOM TO SAVE</h4>
        <p style={hintStyle}>Unable to load savings opportunities.</p>
        <button onClick={refresh} style={linkBtnStyle}>Retry</button>
      </div>
    );
  }

  // Backend is the source of truth for readiness level.
  const status    = data?.readiness?.status;
  const readiness = data?.readiness;

  // ── LEVEL 0 — NO DATA ─────────────────────────────────────────────────────
  if (!data || status === 'NO_DATA') {
    return (
      <div className="budget-glass-panel">
        <h4 style={headerStyle}>ROOM TO SAVE</h4>
        <p style={hintStyle}>Add some expenses to start discovering savings opportunities.</p>
        <button onClick={() => navigate('/expenses')} style={linkBtnStyle}>
          ADD EXPENSES <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // ── LEVEL 1 — INSUFFICIENT HISTORY ───────────────────────────────────────
  if (status === 'INSUFFICIENT_HISTORY') {
    const progressText = readiness
      ? `${readiness.expenseCount}/${readiness.minimumExpenses} transactions · ${readiness.monthsWithData}/${readiness.minimumMonths} months`
      : null;

    return (
      <div className="budget-glass-panel">
        <h4 style={headerStyle}>ROOM TO SAVE</h4>
        <p style={hintStyle}>
          Build more spending history to unlock savings opportunities.
        </p>
        {progressText && (
          <div style={{
            fontSize:          '0.75rem',
            color:             'var(--text-muted)',
            background:        'rgba(255,255,255,0.03)',
            borderRadius:      '6px',
            padding:           '8px 10px',
            marginBottom:      '14px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            Progress: {progressText}
          </div>
        )}
        <button onClick={() => navigate('/expenses')} style={linkBtnStyle}>
          ADD EXPENSES <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // ── LEVEL 2 (PRELIMINARY) or LEVEL 3 (FULL) ──────────────────────────────
  const isPreliminary = status === 'PRELIMINARY';
  const catNames      = (data.categories || []).map((c: any) => c.category).join(', ');

  return (
    <div className="budget-glass-panel">
      <h4 style={headerStyle}>ROOM TO SAVE</h4>

      <div style={{
        fontSize:      '1.75rem',
        fontFamily:    'var(--font-primary)',
        color:         'var(--text-positive)',
        fontWeight:    700,
        marginBottom:  '4px',
        letterSpacing: '-0.02em',
      }}>
        {fmt(data.potentialMonthlySavings ?? 0)}
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        {isPreliminary ? 'Estimated monthly opportunity' : 'Potential monthly savings'}
        {isPreliminary && (
          <span style={{
            marginLeft:     '8px',
            fontSize:       '0.7rem',
            color:          'var(--text-muted)',
            background:     'rgba(255,255,255,0.05)',
            padding:        '2px 6px',
            borderRadius:   '4px',
            verticalAlign:  'middle',
          }}>
            PRELIMINARY
          </span>
        )}
      </div>

      {catNames && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
          Based on:<br />
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{catNames}</span>
        </div>
      )}

      <button onClick={() => navigate('/expenses')} style={linkBtnStyle}>
        VIEW OPPORTUNITIES <ArrowRight size={14} />
      </button>
    </div>
  );
};
