import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSavings } from '../../hooks/useSavings';
import { useGoals } from '../../hooks/useGoals';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';
import { ArrowRight, X, Target, TrendingUp, FileText, ChevronRight, Check } from 'lucide-react';
import '../../styles/savings.css';
import { getToken } from '../../utils/auth';
// Animated Number Component
const AnimatedNumber = ({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) => {
  const [current, setCurrent] = useState(0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let start = 0;
          const end = value;
          const duration = 1500;
          const incrementTime = 30;
          const steps = duration / incrementTime;
          const increment = end / steps;

          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCurrent(end);
              clearInterval(timer);
            } else {
              setCurrent(start);
            }
          }, incrementTime);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={nodeRef}>
      {prefix}{Math.floor(current).toLocaleString('en-IN')}{suffix}
    </span>
  );
};

// Custom Tooltip for Main Graph
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="savings-custom-tooltip">
        <div className="tooltip-label">{label}</div>
        <div className="tooltip-row">
          <div className="dot income-dot"></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Saved</span>
          <span className="tooltip-val" style={{ color: 'var(--text-primary)' }}>₹{payload[0].value.toLocaleString('en-IN')}</span>
        </div>
        {payload[0].payload.rate && (
          <div className="tooltip-row">
             <div className="dot" style={{background: 'var(--text-secondary)'}}></div>
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Rate</span>
             <span className="tooltip-val" style={{ color: 'var(--text-secondary)' }}>{payload[0].payload.rate}%</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const Savings: React.FC = () => {
  const [activeRange, setActiveRange] = useState('1Y');
  const [activeTypeFilter, setActiveTypeFilter] = useState('ALL');
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [successType, setSuccessType] = useState<string | null>(null);

  // API Data
  const { savings, summary, growth, breakdown, loading, error, addSaving, updateSaving, deleteSaving } = useSavings({ range: activeRange, type: activeTypeFilter });
  const { goals, loading: goalsLoading, error: goalsError, addGoal, deleteGoal, fetchGoals } = useGoals();

  // Form State
  const [name, setName] = useState('');
  const [savingType, setSavingType] = useState('PERSONAL');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [note, setNote] = useState('');
  const [goalId, setGoalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editId, setEditId] = useState<string | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const openEditPanel = (saving: any) => {
    setEditId(saving.id);
    setName(saving.name || '');
    setSavingType(saving.type || 'PERSONAL');
    setAmount(saving.amount.toString());
    setDate(saving.date ? new Date(saving.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setTargetAmount(saving.targetAmount ? saving.targetAmount.toString() : '');
    setTargetDate(saving.targetDate ? new Date(saving.targetDate).toISOString().split('T')[0] : '');
    setNote(saving.note || '');
    setGoalId(saving.goalId || '');
    setActivePanel('add-saving');
    setActiveActionMenu(null);
  };

  const openAddPanel = () => {
    setEditId(null);
    setName('');
    setSavingType('PERSONAL');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setTargetAmount('');
    setTargetDate('');
    setNote('');
    setGoalId('');
    setActivePanel('add-saving');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this saving?')) {
      await deleteSaving(id);
      fetchGoals();
    }
    setActiveActionMenu(null);
  };

  const closePanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActivePanel(null);
      setIsClosing(false);
      setSuccessType(null);
      setEditId(null);
      setName('');
      setSavingType('PERSONAL');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setTargetAmount('');
      setTargetDate('');
      setNote('');
    }, 400);
  };

  const handleSuccessAction = async (type: string) => {
    if (type === 'goal') {
      if (!name.trim()) return alert('Goal name is required.');
      if (!targetAmount || Number(targetAmount) <= 0) return alert('Target amount must be greater than zero.');

      const payload: any = {
        name: name.trim(),
        targetAmount: Number(targetAmount),
      };
      
      if (note.trim()) payload.description = note.trim();
      if (targetDate) payload.targetDate = targetDate;
      if (savingType) payload.category = savingType;

      try {
        setIsSubmitting(true);
        await addGoal(payload);
        setSuccessType(type);
        setTimeout(() => {
          closePanel();
        }, 2000);
      } catch (e: any) {
        alert(e.message || 'Error saving goal');
      } finally {
        setIsSubmitting(false);
      }
    } else if (type === 'saving') {
      if (!name.trim()) return alert('Saving name is required.');
      if (!amount || Number(amount) <= 0) return alert('Amount must be greater than zero.');
      if (targetAmount && Number(targetAmount) < 0) return alert('Target amount must be greater than or equal to zero.');
      
      const payload: any = {
        name: name.trim(),
        amount: Number(amount),
        date: date || new Date().toISOString().split('T')[0],
        type: savingType,
        source: 'OTHER',
      };
      
      if (note.trim()) payload.note = note.trim();
      if (goalId) payload.goalId = goalId;
      if (targetAmount && Number(targetAmount) > 0) payload.targetAmount = Number(targetAmount);
      if (targetDate) payload.targetDate = targetDate;
      else if (targetAmount && !targetDate) payload.targetDate = null; // allow nulling target date

      try {
        setIsSubmitting(true);
        if (editId) {
          await updateSaving(editId, payload);
        } else {
          await addSaving(payload);
        }
        fetchGoals();
        setSuccessType(type);
        setTimeout(() => {
          closePanel();
        }, 2000);
      } catch (e: any) {
        alert(e.message || 'Error saving data');
      } finally {
        setIsSubmitting(false);
      }
    } else if (type === 'report') {
      try {
        setIsSubmitting(true);
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/savings/report/pdf', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate report');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        setSuccessType(type);
        setTimeout(() => {
          closePanel();
        }, 2000);
      } catch (e: any) {
        alert(e.message || 'Error downloading report');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setSuccessType(type);
      setTimeout(() => {
        closePanel();
      }, 2000);
    }
  };
  
  // Simulator state
  const [simulatorValue, setSimulatorValue] = useState(5000);
  const baseGoalMonths = 19;
  const currentGoalMonths = Math.max(1, baseGoalMonths - Math.floor(simulatorValue / 1000));
  const monthsSaved = baseGoalMonths - currentGoalMonths;

  const currentGraphData = growth.length > 0 ? growth : [];

  return (
    <div className="savings-dashboard-wrapper">
      {/* Subtle Background Glow */}
      <div className="savings-dashboard-glow"></div>

      <div className="dashboard-content-grid" style={{ zIndex: 1, position: 'relative' }}>
        
        {/* 1. PAGE HEADER */}
        <header className="dashboard-header anim-fade-up delay-1" style={{ flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
            <div>
              <h1 className="header-title">SAVINGS</h1>
              <p className="header-subtext" style={{letterSpacing: '0.05em'}}>Track your savings, understand your progress, and see where your money could take you.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
              <button
                onClick={openAddPanel}
                style={{
                  background: 'var(--accent-gold)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                + ADD SAVING
              </button>
              <div className="header-date">
                <span className="date-badge" style={{color: 'var(--text-positive)', background: 'rgba(46, 204, 113, 0.1)'}}>THIS MONTH</span>
                <span className="date-month" style={{color: 'var(--text-primary)', fontSize: '1.25rem'}}>
                  +{summary ? `₹${summary.thisMonthTotal.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick Actions — secondary buttons */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="dashboard-quick-btn" onClick={() => setActivePanel('set-goal')}>
              <Target size={16} />
              <span>SET SAVINGS GOAL</span>
            </button>
            <button className="dashboard-quick-btn" onClick={() => setActivePanel('optimize')}>
              <TrendingUp size={16} />
              <span>OPTIMIZE SAVINGS</span>
            </button>
            <button className="dashboard-quick-btn" onClick={() => setActivePanel('view-report')}>
              <FileText size={16} />
              <span>VIEW REPORT</span>
            </button>
          </div>
        </header>
        
        <div className="sidebar-divider" style={{margin: '0 0 8px 0'}}></div>

        {/* 2. TOP SUMMARY */}
        <div className="kpi-grid anim-fade-up delay-2">
          <div className="glass-card kpi-card savings-metric-card">
            <div className="kpi-title">TOTAL SAVED</div>
            <div className="kpi-value">
              {summary ? <AnimatedNumber value={summary.totalAllTime} prefix="₹" /> : '₹0'}
            </div>
          </div>
          <div className="glass-card kpi-card savings-metric-card">
            <div className="kpi-title">AVG MONTHLY</div>
            <div className="kpi-value">
              {summary ? <AnimatedNumber value={summary.avgMonthly} prefix="₹" /> : '₹0'}
            </div>
          </div>
          <div className="glass-card kpi-card savings-metric-card">
            <div className="kpi-title">MONTHLY CHANGE</div>
            <div className="kpi-value" style={{color: summary?.monthlyChangePct >= 0 ? 'var(--text-positive)' : 'var(--text-negative)'}}>
              {summary?.monthlyChangePct > 0 ? '+' : ''}{summary?.monthlyChangePct || 0}%
            </div>
          </div>
          <div className="glass-card kpi-card savings-metric-card">
            <div className="kpi-title">PROJECTED YEAR</div>
            <div className="kpi-value" style={{color: 'var(--accent-gold)'}}>
              ₹{summary ? (summary.avgMonthly * 12).toLocaleString('en-IN') : '0'}
            </div>
          </div>
        </div>

        {/* 3. MAIN CONTENT LAYOUT (70/30) */}
        <div className="dashboard-row-2 anim-fade-up delay-3">
          
          {/* LEFT: SAVINGS GROWTH */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="graph-header" style={{ marginBottom: '16px' }}>
              <div>
                <div className="card-title" style={{marginBottom: '4px'}}>SAVINGS GROWTH</div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Cumulative savings over time</div>
              </div>
              <div className="timeframe-controls">
                {['7D', '1M', '3M', '6M', '1Y'].map(range => (
                  <button 
                    key={range}
                    className={`tf-btn ${activeRange === range ? 'active' : ''}`}
                    onClick={() => setActiveRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="graph-container" style={{ flex: 1, minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentGraphData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.1)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}K`} />
                  <RechartsTooltip 
                    content={<CustomTooltip />} 
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                    animationDuration={250}
                    animationEasing="ease-out"
                    isAnimationActive={true}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saved" 
                    stroke="var(--accent-gold)" 
                    strokeWidth={2} 
                    dot={false} 
                    activeDot={{ r: 5, fill: 'var(--accent-gold)', stroke: '#000', strokeWidth: 2 }} 
                    animationDuration={1500}
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(201, 164, 108, 0.3))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: HEALTH & FORECAST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Health */}
            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em' }}>SAVINGS HEALTH</div>
              
              {(() => {
                const firstGoal = goals && goals.length > 0 ? goals[0] : null;
                const hasTarget = !!firstGoal && firstGoal.targetAmount > 0;
                
                if (!hasTarget) {
                  return (
                    <div style={{ textAlign: 'center', margin: 'auto 0' }}>
                      <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-primary)', color: 'var(--text-muted)' }}>—</div>
                      <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>NO TARGET</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Create a savings goal to track your progress.</div>
                    </div>
                  );
                }

                const healthScore = Math.floor(firstGoal.progress || 0);
                let healthStatus = 'BUILDING';
                if (healthScore >= 100) healthStatus = 'GOAL REACHED';
                else if (healthScore >= 50) healthStatus = 'ON TRACK';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '2.5rem', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)', lineHeight: 1 }}>{healthScore}%</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>HEALTH</span>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>₹{(firstGoal.savedAmount || 0).toLocaleString('en-IN')} / ₹{firstGoal.targetAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
                        <span style={{ fontSize: '0.85rem', color: healthScore >= 50 ? 'var(--text-positive)' : 'var(--text-primary)', fontWeight: 500 }}>{healthStatus}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Forecast */}
            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em' }}>SAVINGS FORECAST</div>
              
              {(() => {
                const hasEnoughData = summary && summary.totalCount > 1;
                
                if (!hasEnoughData) {
                  return (
                    <div style={{ textAlign: 'center', margin: 'auto 0' }}>
                      <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Not enough data yet</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Keep recording savings to generate a meaningful forecast.</div>
                    </div>
                  );
                }

                const currentSaved = summary.totalAllTime || 0;
                const projectedAdditional = (summary.avgMonthly || 0) * 12;
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current savings</span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 600 }}>₹{currentSaved.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Projected additional (12m)</span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', fontWeight: 600 }}>+₹{projectedAdditional.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, minHeight: '80px', marginTop: '8px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { name: 'Now', actual: currentSaved, projected: currentSaved },
                          { name: '+12m', projected: currentSaved + projectedAdditional }
                        ]} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <XAxis dataKey="name" hide />
                          <YAxis hide domain={['dataMin', 'dataMax']} />
                          <Line type="monotone" dataKey="actual" stroke="var(--text-primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--bg-primary)', stroke: 'var(--text-primary)', strokeWidth: 2 }} />
                          <Line type="monotone" dataKey="projected" stroke="var(--accent-gold)" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 4, fill: 'var(--bg-primary)', stroke: 'var(--accent-gold)', strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 4. BREAKDOWN & GOALS (50/50) */}
        <div className="dashboard-row-bottom anim-fade-up delay-4" style={{gridTemplateColumns: '1fr 1fr'}}>
          
          {/* Breakdown */}
          <div className="glass-card" style={{ flex: 1 }}>
            <div className="card-title">WHERE YOUR SAVINGS CAME FROM</div>
            <div className="breakdown-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              {breakdown && breakdown.length > 0 ? breakdown.map((b: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '140px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.label}</div>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
                    <div className="anim-width" style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: 'var(--text-positive)', width: `${Math.min(100, (b.impact/ (summary?.thisMonthTotal || 1)) * 100)}%`, borderRadius: '2px' }}></div>
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    +₹{b.impact.toLocaleString('en-IN')}
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No data available for this period.</div>
              )}
            </div>
          </div>

          {/* Goals */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-title">SAVINGS GOALS</div>
            <div className="goals-list" style={{ marginTop: '24px', gap: '20px', display: 'flex', flexDirection: 'column' }}>
              {goalsLoading ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading goals...</div>
              ) : goalsError ? (
                <div style={{ color: 'var(--text-negative)', fontSize: '0.85rem' }}>Error loading goals</div>
              ) : goals && goals.length > 0 ? (
                goals.map((g: any) => (
                  <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{g.name}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{(g.targetAmount).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative' }}>
                        <div className="anim-width" style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: 'var(--text-positive)', width: `${g.progress}%`, borderRadius: '3px' }}></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '70px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{Math.floor(g.progress)}%</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>₹{(g.savedAmount || 0).toLocaleString('en-IN')} saved</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No savings goals yet.<br/><br/>Set a savings goal to start tracking your progress.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECENT SAVINGS LIST */}
        <div className="dashboard-row-1 anim-fade-up delay-5" style={{ marginTop: '24px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="card-title" style={{marginBottom: 0}}>RECENT SAVINGS</div>
              <select 
                value={activeTypeFilter}
                onChange={(e) => setActiveTypeFilter(e.target.value)}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  color: 'var(--text-primary)', 
                  padding: '6px 12px', 
                  fontSize: '0.8rem', 
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Types</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="TRAVEL">Travel</option>
                <option value="EDUCATION">Education</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="HOME">Home</option>
                <option value="RETIREMENT">Retirement</option>
                <option value="PERSONAL">Personal</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savings && savings.length > 0 ? savings.map((saving: any) => (
                <div key={saving.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{saving.name || 'Unnamed Saving'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
                      <span style={{ color: 'var(--accent-gold)' }}>{saving.type ? saving.type.charAt(0) + saving.type.slice(1).toLowerCase() : 'Other'}</span> • {new Date(saving.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {saving.note && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{saving.note}</div>}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    {saving.targetAmount && (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '4px' }}>Goal Progress</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (Number(saving.amount) / Number(saving.targetAmount)) * 100)}%`, height: '100%', background: 'var(--accent-gold)' }} />
                          </div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                            {Math.round(Math.min(100, (Number(saving.amount) / Number(saving.targetAmount)) * 100))}%
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ color: 'var(--text-positive)', fontWeight: 600, fontSize: '1.1rem' }}>
                      +₹{Number(saving.amount).toLocaleString('en-IN')}
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setActiveActionMenu(activeActionMenu === saving.id ? null : saving.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {activeActionMenu === saving.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px', zIndex: 100, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button 
                            onClick={() => openEditPanel(saving)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(saving.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-negative)', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No savings recorded yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* 5. SIMULATOR & AI INSIGHT */}
        <div className="dashboard-row-2 anim-fade-up delay-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          
          <div className="glass-card">
            <div className="card-title">WHAT IF YOU SAVED MORE?</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>Small changes today can move your goals closer.</p>
            
            <div style={{ padding: '0 16px', marginBottom: '32px' }}>
              <input 
                type="range" 
                className="savings-simulator-slider"
                min="0" 
                max="10000" 
                step="500" 
                value={simulatorValue} 
                onChange={(e) => setSimulatorValue(parseInt(e.target.value))}
              />
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'var(--accent-gold)', marginTop: '16px' }}>
                ₹{simulatorValue.toLocaleString('en-IN')} extra / month
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>TIME TO GOAL</span>
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }}>{currentGoalMonths} MO</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>EXTRA YEARLY SAVING</span>
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-primary)', color: 'var(--accent-gold)' }}>₹{(simulatorValue * 12).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>TIME SAVED</span>
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-primary)', color: 'var(--text-positive)' }}>{monthsSaved} MO</span>
              </div>
            </div>
          </div>

          <div className="glass-card ai-insight-card">
             <div className="ai-header">
                <div className="ai-title">✦ FINWISE AI NOTICED</div>
              </div>
              <div className="ai-statement" style={{ fontSize: '1.1rem', marginBottom: '32px' }}>
                "You're consistently saving more than last month. Increasing your monthly savings by ₹2,000 could bring your emergency fund goal closer sooner."
              </div>
              <div className="ai-impact">
                <span className="impact-label">POTENTIAL IMPACT</span>
                <span className="impact-value">+₹24,000 / YEAR</span>
              </div>
              <button className="ai-action-btn" onClick={() => setActivePanel('optimize')}>
                OPTIMIZE SAVINGS <ArrowRight size={14} />
              </button>
          </div>
        </div>

        {/* 6. ANALYTICS (Small row) */}
        <div className="glass-card anim-fade-up delay-6" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div className="card-title" style={{marginBottom: 0}}>SAVINGS ANALYTICS</div>
            <div className="date-badge">POWER BI READY</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', height: '120px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Savings Rate</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '4px', paddingTop: '16px' }}>
                {[30, 32, 31, 33, 34, 35, 36.2].map((v, i) => (
                  <div key={i} style={{ flex: 1, background: i === 6 ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', height: `${(v/40)*100}%`, borderRadius: '2px' }}></div>
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', height: '120px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly Savings</span>
              <div style={{ flex: 1, marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth.slice(-6)} margin={{top:10, right:0, left:0, bottom:0}}>
                    <Bar dataKey="saved" fill="rgba(255,255,255,0.2)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', height: '120px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cumulative Savings</span>
              <div style={{ flex: 1, marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growth} margin={{top:10, right:0, left:0, bottom:0}}>
                    <Line type="monotone" dataKey="saved" stroke="var(--text-positive)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      {activePanel && createPortal(
        <div className={`qa-overlay center ${isClosing ? 'closing' : 'opening'}`} onClick={closePanel}>
          {activePanel === 'optimize' && (
            <div className={`qa-panel floating ${isClosing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
              <button className="qa-close-btn" onClick={closePanel}><X size={24} /></button>
              <div className="qa-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {successType !== 'optimize' ? (
                  <>
                    <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '40px', textTransform: 'uppercase' }}>OPTIMIZE YOUR SAVINGS</h2>
            
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '48px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CURRENT MONTHLY SAVINGS</div>
                        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem' }}>₹30,800</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SUGGESTED TARGET</div>
                        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'var(--accent-gold)' }}>₹35,000</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>POTENTIAL YEARLY DIFFERENCE</div>
                        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'var(--text-positive)' }}>+₹50,400</div>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '24px' }}>RECOMMENDATIONS</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem' }}>Reduce dining</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.875rem' }}>+₹2,400</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem' }}>Reduce subscriptions</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.875rem' }}>+₹768</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem' }}>Increase auto-savings</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.875rem' }}>+₹2,000</span>
                      </div>
                    </div>

                    <button className="ai-action-btn" style={{ marginTop: 'auto', background: 'var(--text-primary)', color: '#000', justifyContent: 'center' }} onClick={() => handleSuccessAction('optimize')}>
                      APPLY PLAN
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'toastDrop 0.5s ease' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <TrendingUp size={32} color="var(--text-positive)" strokeWidth={3} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '8px' }}>Optimization Applied!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Your budget has been adjusted with the new savings target.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel?.startsWith('goal-') && (
            <div className={`qa-panel floating ${isClosing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
              <button className="qa-close-btn" onClick={closePanel}><X size={24} /></button>
              <div className="qa-panel-content">
                <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '40px', textTransform: 'uppercase' }}>GOAL DETAILS</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '48px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CURRENT PROGRESS</div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem' }}>₹72,000 / ₹1,50,000</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>REMAINING</div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'var(--accent-gold)' }}>₹78,000</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>MONTHLY TARGET</div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem' }}>₹12,000</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ESTIMATED COMPLETION</div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem', color: 'var(--text-positive)' }}>DEC 2026</div>
                  </div>
                </div>

                <button className="ai-action-btn" style={{ marginTop: '16px', justifyContent: 'center' }} onClick={closePanel}>
                  ADJUST GOAL
                </button>
              </div>
            </div>
          )}

          {activePanel === 'add-saving' && (
            <div className={`qa-panel floating ${isClosing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
              <button className="qa-close-btn" onClick={closePanel}><X size={24} /></button>
              <div className="qa-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {successType !== 'saving' ? (
                  <>
                    <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '40px', textTransform: 'uppercase' }}>
                      {editId ? 'EDIT SAVING' : 'RECORD NEW SAVING'}
                    </h2>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>SAVING NAME</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none' }} 
                        placeholder="e.g. Emergency Fund" 
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>SAVING TYPE</label>
                      <select 
                        value={savingType}
                        onChange={(e) => setSavingType(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none', appearance: 'none' }} 
                      >
                        <option value="EMERGENCY">Emergency</option>
                        <option value="TRAVEL">Travel</option>
                        <option value="EDUCATION">Education</option>
                        <option value="VEHICLE">Vehicle</option>
                        <option value="HOME">Home</option>
                        <option value="RETIREMENT">Retirement</option>
                        <option value="PERSONAL">Personal</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>AMOUNT</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0', top: '2px', color: 'var(--text-muted)', fontSize: '1.5rem', fontFamily: 'var(--font-primary)' }}>₹</span>
                        <input 
                          type="number" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '1.5rem', fontFamily: 'var(--font-primary)', padding: '4px 0 4px 32px', outline: 'none' }} 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>DATE</label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none' }} 
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>LINK TO GOAL (OPTIONAL)</label>
                      <select 
                        value={goalId}
                        onChange={(e) => setGoalId(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none', appearance: 'none' }} 
                      >
                        <option value="">-- No Goal --</option>
                        {goals?.map((g: any) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>TARGET AMOUNT (OPTIONAL)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-primary)' }}>₹</span>
                        <input 
                          type="number" 
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(e.target.value)}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px 12px 12px 28px', fontSize: '0.9rem', outline: 'none' }} 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>TARGET DATE (OPTIONAL)</label>
                      <input 
                        type="date" 
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none' }} 
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>SOURCE / NOTE</label>
                      <input 
                        type="text" 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none' }} 
                        placeholder="e.g. Salary, Bonus, Reduced Expenses" 
                      />
                    </div>

                    <button 
                      className="ai-action-btn" 
                      style={{ marginTop: 'auto', background: 'var(--text-primary)', color: '#000', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }} 
                      onClick={() => handleSuccessAction('saving')}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'SAVING...' : (editId ? 'SAVE CHANGES' : 'CONFIRM SAVING')}
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'toastDrop 0.5s ease' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <Check size={32} color="var(--text-positive)" strokeWidth={3} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '8px' }}>Saving Recorded!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Your saving has been successfully processed.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'set-goal' && (
            <div className={`qa-panel floating ${isClosing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
              <button className="qa-close-btn" onClick={closePanel}><X size={24} /></button>
              <div className="qa-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {successType !== 'goal' ? (
                  <>
                    <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '40px', textTransform: 'uppercase' }}>NEW SAVINGS GOAL</h2>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>GOAL NAME</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '0.9rem', outline: 'none' }} 
                        placeholder="e.g. New Car, Vacation" 
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px' }}>TARGET AMOUNT</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0', top: '2px', color: 'var(--text-muted)', fontSize: '1.5rem', fontFamily: 'var(--font-primary)' }}>₹</span>
                        <input 
                          type="number" 
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '1.5rem', fontFamily: 'var(--font-primary)', padding: '4px 0 4px 32px', outline: 'none' }} 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>

                    <button 
                      className="ai-action-btn" 
                      style={{ marginTop: 'auto', background: 'var(--accent-gold)', color: '#000', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }} 
                      onClick={() => handleSuccessAction('goal')}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'CREATING...' : 'CREATE GOAL'}
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'toastDrop 0.5s ease' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(201, 164, 108, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <Target size={32} color="var(--accent-gold)" strokeWidth={2} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '8px' }}>Goal Created!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Your new savings goal has been set up successfully.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'view-report' && (
            <div className={`qa-panel floating ${isClosing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
              <button className="qa-close-btn" onClick={closePanel}><X size={24} /></button>
              <div className="qa-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {successType !== 'report' ? (
                  <>
                    <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '40px', textTransform: 'uppercase' }}>MONTHLY REPORT</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '48px' }}>
                      <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                         <FileText size={48} color="var(--accent-gold)" style={{ opacity: 0.8, marginBottom: '16px' }} />
                         <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-primary)' }}>August 2026 Report Ready</h3>
                         <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>Your comprehensive savings and optimization report has been generated and is ready to download.</p>
                      </div>
                    </div>

                    <button className="ai-action-btn" style={{ marginTop: 'auto', background: 'var(--text-primary)', color: '#000', justifyContent: 'center' }} onClick={() => handleSuccessAction('report')}>
                      DOWNLOAD PDF
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'toastDrop 0.5s ease' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <Check size={32} color="var(--text-positive)" strokeWidth={3} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '8px' }}>Downloaded!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Your PDF report is downloading to your device.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

    </div>
  );
};

export default Savings;
