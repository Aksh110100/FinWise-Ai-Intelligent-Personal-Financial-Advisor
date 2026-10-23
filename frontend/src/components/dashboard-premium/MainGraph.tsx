import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';

const timeframes = ['7D', '1M', '3M', '6M', '1Y'];

interface HoverState {
  x: number;
  incomeY: number;
  expenseY: number;
  label: string;
  income: number;
  expense: number;
}

export const MainGraph: React.FC = () => {
  const { cashFlow, cashFlowRange, setCashFlowRange } = useDashboard();
  const [hoverData, setHoverData] = useState<HoverState | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG Dimension Constants
  const viewBoxWidth = 800;
  const viewBoxHeight = 300;
  const plotLeft = 0;
  const plotRight = viewBoxWidth;
  const plotTop = 40;
  const plotBottom = 260;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const points = useMemo(() => {
    const data = cashFlow.data?.points ?? [];
    if (data.length === 0) return [];

    let max = 0;
    let min = Infinity;
    data.forEach(d => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
      if (d.income < min) min = d.income;
      if (d.expense < min) min = d.expense;
    });

    if (max === 0) {
      // All zeros – place flat line at bottom
      return data.map((d, index) => ({
        ...d,
        x: plotLeft + (index * (plotWidth / Math.max(data.length - 1, 1))),
        incomeY: plotBottom,
        expenseY: plotBottom,
      }));
    }

    const range = max - min;
    const paddedMax = max + (range * 0.15 || max * 0.1);
    const paddedMin = Math.max(0, min - (range * 0.1));

    return data.map((d, index) => {
      const x = plotLeft + (index * (plotWidth / Math.max(data.length - 1, 1)));
      const incomeY = plotBottom - (((d.income - paddedMin) / (paddedMax - paddedMin)) * plotHeight);
      const expenseY = plotBottom - (((d.expense - paddedMin) / (paddedMax - paddedMin)) * plotHeight);
      return { ...d, x, incomeY, expenseY };
    });
  }, [cashFlow.data, plotWidth, plotHeight]);

  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const incomePath = generateSmoothPath(points.map(p => ({ x: p.x, y: p.incomeY })));
  const expensePath = generateSmoothPath(points.map(p => ({ x: p.x, y: p.expenseY })));

  const handleInteraction = (clientX: number) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const scaleX = viewBoxWidth / rect.width;
    const svgX = mouseX * scaleX;

    let closestPoint = points[0];
    let minDistance = Infinity;
    points.forEach((p) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = p;
      }
    });

    setHoverData({
      x: closestPoint.x,
      incomeY: closestPoint.incomeY,
      expenseY: closestPoint.expenseY,
      label: closestPoint.label,
      income: closestPoint.income,
      expense: closestPoint.expense,
    });
    setIsHovered(true);
  };

  const onMouseMove = (e: React.MouseEvent) => handleInteraction(e.clientX);
  const onTouchMove = (e: React.TouchEvent) => handleInteraction(e.touches[0].clientX);
  const onMouseLeave = () => setIsHovered(false);

  useEffect(() => {
    if (points.length > 0) {
      const last = points[points.length - 1];
      setHoverData({
        x: last.x,
        incomeY: last.incomeY,
        expenseY: last.expenseY,
        label: last.label,
        income: last.income,
        expense: last.expense,
      });
    } else {
      setHoverData(null);
    }
  }, [cashFlow.data]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const renderTooltip = () => {
    if (!hoverData) return null;
    const isNearRight = hoverData.x > viewBoxWidth * 0.6;
    return (
      <div
        className="graph-tooltip"
        style={{
          position: 'absolute',
          left: hoverData.x,
          top: '40px',
          transform: isNearRight ? 'translateX(calc(-100% - 20px))' : 'translateX(20px)',
          opacity: isHovered ? 1 : 0,
          pointerEvents: 'none',
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="tooltip-label">{hoverData.label}</div>
        <div className="tooltip-row">
          <span className="dot" style={{ background: 'rgba(255,255,255,0.9)' }}></span>
          <span>Income</span>
          <span className="tooltip-val" style={{ color: 'rgba(255,255,255,0.9)' }}>{formatCurrency(hoverData.income)}</span>
        </div>
        <div className="tooltip-row">
          <span className="dot" style={{ background: 'var(--text-positive)' }}></span>
          <span>Expenses</span>
          <span className="tooltip-val" style={{ color: 'var(--text-positive)' }}>{formatCurrency(hoverData.expense)}</span>
        </div>
      </div>
    );
  };

  const isEmpty = !cashFlow.loading && (cashFlow.data?.points ?? []).length === 0;
  const allZero = !isEmpty && (cashFlow.data?.points ?? []).every(p => p.income === 0 && p.expense === 0);

  return (
    <div className="glass-card main-graph-card anim-fade-up delay-6" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="graph-header">
        <div>
          <h3 className="card-title">INCOME VS EXPENSES</h3>
        </div>
        <div className="timeframe-controls">
          {timeframes.map(tf => (
            <button
              key={tf}
              className={`tf-btn ${cashFlowRange === tf ? 'active' : ''}`}
              onClick={() => setCashFlowRange(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {cashFlow.loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Loading chart data…
        </div>
      )}

      {cashFlow.error && !cashFlow.loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          ⚠ {cashFlow.error}
        </div>
      )}

      {(isEmpty || allZero) && !cashFlow.loading && !cashFlow.error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No income or expense records for this period.
        </div>
      )}

      {!cashFlow.loading && !cashFlow.error && !isEmpty && !allZero && points.length > 0 && (
        <div className="graph-container" style={{ position: 'relative' }}>
          {renderTooltip()}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            className="main-svg-graph"
            preserveAspectRatio="none"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onTouchStart={(e) => handleInteraction(e.touches[0].clientX)}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseLeave}
            style={{ cursor: 'crosshair', touchAction: 'none' }}
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <line x1="0" y1={plotBottom} x2={viewBoxWidth} y2={plotBottom} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1={plotBottom - (plotHeight / 2)} x2={viewBoxWidth} y2={plotBottom - (plotHeight / 2)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1={plotTop} x2={viewBoxWidth} y2={plotTop} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            <path d={expensePath} fill="none" stroke="var(--text-positive)" strokeWidth="3" className="svg-draw-line-slow" />
            <path d={incomePath} fill="none" stroke="var(--text-primary)" strokeWidth="3" className="svg-draw-line-slow" />

            {hoverData && (
              <g style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease-out' }}>
                <line
                  x1={hoverData.x} y1={plotTop}
                  x2={hoverData.x} y2={plotBottom}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  style={{ transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
                />
                <circle
                  cx={hoverData.x}
                  cy={hoverData.incomeY}
                  r="4.5"
                  fill="var(--bg-primary)"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="2.5"
                  filter="url(#subtleGlow)"
                  style={{ transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
                />
                <circle
                  cx={hoverData.x}
                  cy={hoverData.expenseY}
                  r="4.5"
                  fill="var(--bg-primary)"
                  stroke="var(--text-positive)"
                  strokeWidth="2.5"
                  filter="url(#subtleGlow)"
                  style={{ transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
                />
              </g>
            )}
          </svg>

          <div className="graph-x-axis" style={{ pointerEvents: 'none' }}>
            {points.map((p, i) => {
              const isActive = isHovered && hoverData?.label === p.label;
              // For large datasets show every Nth label
              const skip = points.length > 30 ? 7 : points.length > 14 ? 3 : 1;
              if (i % skip === 0 || isActive) {
                return (
                  <span
                    key={`${p.date}-${i}`}
                    style={{
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'color 0.2s, font-weight 0.2s',
                    }}
                  >
                    {p.label}
                  </span>
                );
              }
              return <span key={`${p.date}-${i}`} style={{ visibility: 'hidden' }}>{p.label}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};
