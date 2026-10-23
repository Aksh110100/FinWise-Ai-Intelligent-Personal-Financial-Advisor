import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, ArrowRight, X, AlertCircle, CheckCircle, Search, 
  Target, PieChart as PieChartIcon, ShieldAlert 
} from 'lucide-react';
import { investmentApi, Investment, InvestmentPlan } from '../../api/investmentService';
import '../../styles/investments.css';

// Using a simple color palette for allocation segments
const colors = ['#C9A46C', '#2ECC71', '#3498DB', '#9B59B6', '#F1C40F', '#E74C3C', '#95A5A6'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.value >= data.invested;
    const returnValue = data.value - data.invested;
    
    return (
      <div className="inv-custom-tooltip">
        <div className="tooltip-title">{data.label}</div>
        <div className="tooltip-row">
          <span style={{ color: 'var(--text-secondary)' }}>Portfolio</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{data.value.toLocaleString()}</span>
        </div>
        {data.invested !== undefined && (
          <div className="tooltip-row">
            <span style={{ color: 'var(--text-secondary)' }}>Invested</span>
            <span style={{ color: 'var(--text-primary)' }}>₹{data.invested.toLocaleString()}</span>
          </div>
        )}
        {data.invested !== undefined && (
          <div className="tooltip-row" style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Return</span>
            <span style={{ color: isPositive ? 'var(--text-positive)' : 'var(--accent-coral)', fontWeight: 600 }}>
              {isPositive ? '+' : '-'}₹{Math.abs(returnValue).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function Investments() {
  const [activeRange, setActiveRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [successType, setSuccessType] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalInvested: 0, currentValue: 0, totalReturns: 0, returnPercentage: 0, isEmpty: true });
  const [allocation, setAllocation] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [reviewData, setReviewData] = useState<any>(null);

  const fetchData = async (ignore: boolean) => {
    try {
      setLoading(true);
      const [sum, alloc, perf, invs] = await Promise.all([
        investmentApi.getSummary(),
        investmentApi.getAllocation(),
        investmentApi.getPerformance(activeRange),
        investmentApi.getInvestments()
      ]);
      if (!ignore) {
        setSummary(sum || { totalInvested: 0, currentValue: 0, totalReturns: 0, returnPercentage: 0, isEmpty: true });
        setAllocation(alloc || []);
        setPerformance(perf || []);
        setInvestments(invs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetchData(ignore);
    return () => { ignore = true; };
  }, [activeRange]);

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const allocationSegments = (allocation || []).map((cat, i) => {
    const strokeDasharray = `${(cat.percentageOfPortfolio / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (cat.percentageOfPortfolio / 100) * circumference;
    return {
      ...cat,
      color: colors[i % colors.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const displayAlloc = activeIndex !== null && activeIndex < allocation.length 
    ? allocationSegments[activeIndex] 
    : null;

  // Planner state
  const [plannerMonthly, setPlannerMonthly] = useState(5000);
  const [plannerReturn, setPlannerReturn] = useState(12);
  const [plannerYears, setPlannerYears] = useState(10);

  const projectedValue = useMemo(() => {
    const r = plannerReturn / 100 / 12;
    const n = plannerYears * 12;
    if (r === 0) return plannerMonthly * n;
    return Math.round(plannerMonthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }, [plannerMonthly, plannerReturn, plannerYears]);

  const closePanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActivePanel(null);
      setIsClosing(false);
      setSuccessType(null);
    }, 400);
  };

  const handleSuccessAction = (type: string) => {
    setSuccessType(type);
    setTimeout(() => {
      closePanel();
      fetchData(false);
    }, 2000);
  };

  // Add Investment State
  const [invForm, setInvForm] = useState({ name: '', type: 'STOCK', investedAmount: 0 });
  const submitAddInvestment = async () => {
    try {
      await investmentApi.createInvestment(invForm);
      handleSuccessAction('add');
    } catch (err) {
      console.error(err);
    }
  };

  // Add Plan State
  const [planForm, setPlanForm] = useState({ name: '', assetType: 'STOCK', plannedAmount: 0 });
  const submitPlan = async () => {
    try {
      await investmentApi.createPlan(planForm as any);
      handleSuccessAction('plan');
    } catch (err) {
      console.error(err);
    }
  };

  const currentGraphData = (performance || []).map(p => {
    const d = new Date(p.snapshotDate);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const tick = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      label,
      tick,
      value: p.currentPortfolioValue,
      invested: p.totalInvested
    };
  });

  const fetchReview = async () => {
    try {
      const data = await investmentApi.getReview();
      setReviewData(data);
      setActivePanel('review');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="investments-container">
      <div className="investments-glow-bg"></div>

      {/* Header */}
      <div className="inv-animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: '2.5rem', fontWeight: 300, letterSpacing: '0.05em', margin: '0 0 8px 0' }}>INVESTMENTS</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
              Understand your portfolio, track growth,<br/>and plan where your money goes next.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setActivePanel('add')}
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
              + ADD INVESTMENT
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '4px' }}>PORTFOLIO VALUE</div>
              <div style={{ fontFamily: 'var(--font-primary)', fontSize: '2rem', color: 'var(--accent-gold)' }}>₹{summary.currentValue.toLocaleString()}</div>
              <div style={{ color: 'var(--text-positive)', fontSize: '0.875rem', marginTop: '4px' }}>
                +{summary.returnPercentage}% all time
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions — secondary buttons */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="dashboard-quick-btn" onClick={() => setActivePanel('plan')}>
            <Target size={16} />
            <span>PLAN INVESTMENT</span>
          </button>
          <button className="dashboard-quick-btn" onClick={() => fetchReview()}>
            <PieChartIcon size={16} />
            <span>REVIEW PORTFOLIO</span>
          </button>
          <button className="dashboard-quick-btn" onClick={() => setActivePanel('set-goal')}>
            <ShieldAlert size={16} />
            <span>SET INVESTMENT GOAL</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Loading portfolio data...</div>
      ) : summary.isEmpty ? (
        <div className="inv-glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2 style={{ fontFamily: 'var(--font-primary)', color: 'var(--text-primary)', marginBottom: '16px' }}>No Investments Yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Add your first investment to start tracking your portfolio performance and allocation.</p>
          <button className="ai-action-btn" style={{ margin: '0 auto' }} onClick={() => setActivePanel('add')}>
            ADD INVESTMENT <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <>
          {/* Summary Metrics */}
          <div className="inv-metrics-grid inv-animate-fade-up delay-100">
            <div className="inv-glass-panel interactive">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '8px' }}>TOTAL INVESTED</div>
              <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem' }}>₹{Number(summary.totalInvested).toLocaleString()}</div>
            </div>
            <div className="inv-glass-panel interactive">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '8px' }}>CURRENT VALUE</div>
              <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'var(--accent-gold)' }}>₹{Number(summary.currentValue).toLocaleString()}</div>
            </div>
            <div className="inv-glass-panel interactive">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '8px' }}>TOTAL RETURNS</div>
              <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: summary.totalReturns >= 0 ? 'var(--text-positive)' : 'var(--accent-coral)' }}>
                {summary.totalReturns >= 0 ? '+' : ''}₹{Number(summary.totalReturns).toLocaleString()}
              </div>
            </div>
            <div className="inv-glass-panel interactive">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '8px' }}>RETURN</div>
              <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: summary.totalReturns >= 0 ? 'var(--text-positive)' : 'var(--accent-coral)' }}>
                {summary.totalReturns >= 0 ? '+' : ''}{summary.returnPercentage}%
              </div>
            </div>
          </div>

          {/* Portfolio Overview & Allocation */}
          <div className="inv-overview-grid inv-animate-fade-up delay-200">
            <div className="inv-glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>PORTFOLIO PERFORMANCE</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Growth of your invested capital</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setActiveRange(range)}
                      style={{
                        background: activeRange === range ? 'rgba(201, 164, 108, 0.1)' : 'transparent',
                        color: activeRange === range ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        border: '1px solid',
                        borderColor: activeRange === range ? 'rgba(201, 164, 108, 0.3)' : 'transparent',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'var(--font-secondary)'
                      }}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minHeight: '300px' }}>
                {currentGraphData.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    <p>No historical performance data available for this period.</p>
                    <p style={{ fontSize: '0.85rem' }}>Snapshots are recorded when investments are added.</p>
                  </div>
                ) : currentGraphData.length === 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <p>Only one genuine valuation is available ({currentGraphData[0].tick}).</p>
                    <p style={{ fontSize: '0.85rem' }}>More history is needed to display a trend. New snapshots will be recorded going forward.</p>
                    <div style={{ marginTop: '16px', padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '4px' }}>CURRENT PORTFOLIO VALUE</div>
                      <div style={{ color: 'var(--accent-gold)', fontSize: '1.25rem', fontWeight: 600 }}>₹{currentGraphData[0].value.toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentGraphData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                      <XAxis 
                        dataKey="tick" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                        dy={10} 
                      />
                      <Tooltip 
                        content={<CustomTooltip />} 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--accent-gold)" 
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: 'var(--accent-gold)', stroke: 'rgba(201, 164, 108, 0.3)', strokeWidth: 4 }}
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="inv-glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem', margin: '0 0 24px 0', letterSpacing: '0.05em' }}>PORTFOLIO ALLOCATION</h2>
              <div className="donut-container">
                <div className="donut-chart-wrapper">
                  <svg viewBox="0 0 240 240" className="donut-svg">
                    <circle 
                      cx="120" cy="120" r={radius} 
                      fill="none" 
                      stroke="rgba(255,255,255,0.05)" 
                      strokeWidth="20" 
                    />
                    
                    {allocationSegments.map((seg, idx) => (
                      <circle
                        key={idx}
                        cx="120" cy="120" r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={activeIndex === idx ? "24" : "20"}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="donut-segment svg-draw-circle"
                        style={{ 
                          transition: 'stroke-width 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseLeave={() => setActiveIndex(null)}
                      />
                    ))}
                  </svg>

                  <div className="donut-center-text">
                    <span className="donut-amount">
                      {displayAlloc ? `₹${displayAlloc.currentValue.toLocaleString()}` : `₹${summary.currentValue.toLocaleString()}`}
                    </span>
                    <span className="donut-label">
                      {displayAlloc ? displayAlloc.assetType : 'TOTAL PORTFOLIO'}
                    </span>
                  </div>
                </div>

                <div className="donut-legend">
                  {allocationSegments.map((seg, idx) => (
                    <div 
                      key={idx} 
                      className={`legend-item ${activeIndex === idx ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      <div className="legend-color" style={{ backgroundColor: seg.color }}></div>
                      <span className="legend-name">{seg.assetType}</span>
                      <span className="legend-pct">{seg.percentageOfPortfolio}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="inv-breakdown-grid inv-animate-fade-up delay-300">
            <div className="inv-glass-panel">
              <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '24px' }}>WHERE YOUR MONEY IS INVESTED</h3>
              <div className="inv-breakdown-bar-container">
                {allocationSegments.map((item, idx) => (
                  <div key={idx} className="inv-bar-row">
                    <div className="inv-bar-header">
                      <span style={{ fontSize: '0.875rem' }}>{item.assetType}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-primary)' }}>₹{item.currentValue.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.percentageOfPortfolio}%</div>
                      </div>
                    </div>
                    <div className="inv-bar-track">
                      <div className="inv-bar-fill" style={{ width: `${item.percentageOfPortfolio}%`, background: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="inv-glass-panel inv-animate-fade-up delay-400" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '24px' }}>YOUR INVESTMENTS</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(investments || []).map((inv, idx) => {
                const val = inv.currentValue || inv.investedAmount;
                const ret = val - inv.investedAmount;
                const pct = ((ret / inv.investedAmount) * 100).toFixed(2);
                return (
                  <div key={inv.id} className="inv-list-row">
                    <div className="inv-list-col">
                      <div style={{ fontWeight: 500 }}>{inv.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{inv.type}</div>
                    </div>
                    <div className="inv-list-col" style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.125rem' }}>₹{Number(val).toLocaleString()}</div>
                    </div>
                    <div className="inv-list-col" style={{ textAlign: 'center', color: ret >= 0 ? 'var(--text-positive)' : 'var(--accent-coral)' }}>
                      {ret >= 0 ? '+' : ''}{pct}%
                    </div>
                    <div className="inv-list-col" style={{ textAlign: 'right' }}>
                      <button onClick={async () => {
                        await investmentApi.deleteInvestment(inv.id);
                        fetchData(false);
                      }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Planner & Watchlist (Preserved UI) */}
      <div className="inv-breakdown-grid inv-animate-fade-up delay-500">
        <div className="inv-glass-panel">
          <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '32px' }}>PLAN YOUR NEXT INVESTMENT</h3>
          
          <div className="inv-planner-row">
            <div className="inv-planner-header">
              <span>MONTHLY INVESTMENT</span>
              <span style={{ fontFamily: 'var(--font-primary)', color: 'var(--accent-gold)' }}>₹{plannerMonthly.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="0" max="50000" step="1000" 
              value={plannerMonthly} 
              onChange={(e) => setPlannerMonthly(Number(e.target.value))}
              className="inv-slider"
            />
          </div>

          <div className="inv-planner-row">
            <div className="inv-planner-header">
              <span>EXPECTED RETURN</span>
              <span style={{ fontFamily: 'var(--font-primary)', color: 'var(--accent-gold)' }}>{plannerReturn}%</span>
            </div>
            <input 
              type="range" 
              min="1" max="25" step="0.5" 
              value={plannerReturn} 
              onChange={(e) => setPlannerReturn(Number(e.target.value))}
              className="inv-slider"
            />
          </div>

          <div className="inv-planner-row">
            <div className="inv-planner-header">
              <span>TIME PERIOD</span>
              <span style={{ fontFamily: 'var(--font-primary)', color: 'var(--accent-gold)' }}>{plannerYears} YEARS</span>
            </div>
            <input 
              type="range" 
              min="1" max="30" step="1" 
              value={plannerYears} 
              onChange={(e) => setPlannerYears(Number(e.target.value))}
              className="inv-slider"
            />
          </div>

          <div style={{ marginTop: '40px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>PROJECTED VALUE</span>
            <span style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'var(--text-positive)' }}>
              ₹{projectedValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activePanel && createPortal(
        <div className={`qa-overlay center ${isClosing ? 'closing' : 'opening'}`} onClick={closePanel}>
          <div className={`qa-panel floating ${isClosing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
            <button className="qa-close-btn" onClick={closePanel}><X size={24} /></button>
            <div className="qa-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {!successType ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '40px', textTransform: 'uppercase' }}>
                    {activePanel === 'add' ? 'ADD INVESTMENT' :
                     activePanel === 'plan' ? 'PLAN INVESTMENT' :
                     activePanel === 'review' ? 'PORTFOLIO REVIEW' :
                     activePanel === 'set-goal' ? 'SET GOAL' : 'DETAILS'}
                  </h2>
                  <div style={{ flex: 1 }}>
                    {activePanel === 'add' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Name</label>
                          <input type="text" value={invForm.name} onChange={e => setInvForm({...invForm, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Type</label>
                          <select value={invForm.type} onChange={e => setInvForm({...invForm, type: e.target.value})} style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}>
                            <option value="STOCK">STOCK</option>
                            <option value="MUTUAL_FUND">MUTUAL FUND</option>
                            <option value="ETF">ETF</option>
                            <option value="BOND">BOND</option>
                            <option value="GOLD">GOLD</option>
                            <option value="CRYPTO">CRYPTO</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Invested Amount (₹)</label>
                          <input type="number" value={invForm.investedAmount} onChange={e => setInvForm({...invForm, investedAmount: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                        </div>
                      </div>
                    )}
                    
                    {activePanel === 'review' && reviewData && (
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <p>{reviewData.insights}</p>
                        <p>Total Return: {reviewData.summary.returnPercentage}%</p>
                        {reviewData.topHoldings.length > 0 && (
                          <div style={{ marginTop: '16px' }}>
                            <strong>Top Holdings:</strong>
                            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                              {reviewData.topHoldings.map((h: any) => <li key={h.id}>{h.name}</li>)}
                            </ul>
                          </div>
                        )}
                        {reviewData.hasMissingPrices && (
                          <div style={{ marginTop: '16px', color: 'var(--accent-coral)' }}>
                            <AlertCircle size={16} style={{ display: 'inline', marginRight: '4px' }} />
                            Some investments are missing current prices. Update them for accurate tracking.
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activePanel === 'plan' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Plan Name</label>
                          <input type="text" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Target Asset Type</label>
                          <select value={planForm.assetType} onChange={e => setPlanForm({...planForm, assetType: e.target.value})} style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}>
                            <option value="STOCK">STOCK</option>
                            <option value="MUTUAL_FUND">MUTUAL FUND</option>
                            <option value="ETF">ETF</option>
                            <option value="BOND">BOND</option>
                            <option value="GOLD">GOLD</option>
                            <option value="CRYPTO">CRYPTO</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Planned Amount (₹)</label>
                          <input type="number" value={planForm.plannedAmount} onChange={e => setPlanForm({...planForm, plannedAmount: Number(e.target.value)})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} />
                        </div>
                      </div>
                    )}
                    
                    {activePanel !== 'add' && activePanel !== 'review' && activePanel !== 'plan' && (
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Goal setting functionality will be available soon.
                      </p>
                    )}
                  </div>
                  {activePanel === 'add' ? (
                    <button className="ai-action-btn" style={{ marginTop: '40px', background: 'var(--text-primary)', color: '#000', justifyContent: 'center' }} onClick={submitAddInvestment}>
                      ADD
                    </button>
                  ) : activePanel === 'review' ? (
                     <button className="ai-action-btn" style={{ marginTop: '40px', background: 'var(--text-primary)', color: '#000', justifyContent: 'center' }} onClick={closePanel}>
                       DONE
                     </button>
                  ) : activePanel === 'plan' ? (
                    <button className="ai-action-btn" style={{ marginTop: '40px', background: 'var(--text-primary)', color: '#000', justifyContent: 'center' }} onClick={submitPlan}>
                      SAVE PLAN
                    </button>
                  ) : (

                    <button className="ai-action-btn" style={{ marginTop: '40px', background: 'var(--text-primary)', color: '#000', justifyContent: 'center' }} onClick={() => {
                      if (activePanel === 'set-goal') {
                        closePanel();
                      } else {
                        handleSuccessAction(activePanel);
                      }
                    }}>
                      CONFIRM
                    </button>
                  )}
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'toastDrop 0.5s ease' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    <CheckCircle size={32} color="var(--text-positive)" strokeWidth={3} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', marginBottom: '8px' }}>Action Successful!</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Your request was processed successfully.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
