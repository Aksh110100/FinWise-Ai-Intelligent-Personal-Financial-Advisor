import React, { useState, useMemo, useRef } from 'react';
import { useReportContext } from '../../contexts/ReportContext';

interface HoverState {
  x: number;
  incomeY: number;
  expenseY: number;
  data: { label: string; in: number; out: number };
}

export const CashFlowChart: React.FC = () => {
  const { snapshot, loading } = useReportContext();
  const [hoverData, setHoverData] = useState<HoverState | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const rawData = snapshot?.cashFlowSeries || [];

  const viewBoxWidth = 800;
  const viewBoxHeight = 350;
  const plotLeft = 0;
  const plotRight = viewBoxWidth;
  const plotTop = 40; 
  const plotBottom = 300; 
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const { points, maxValue, minValue } = useMemo(() => {
    let max = 0;
    let min = Infinity;
    rawData.forEach((d: any) => {
      if (d.in > max) max = d.in;
      if (d.out > max) max = d.out;
      if (d.in < min) min = d.in;
      if (d.out < min) min = d.out;
    });

    if (max === 0 && min === 0) {
      max = 1000;
      min = 0;
    } else if (max === min) {
      const pad = Math.abs(max * 0.1) || 1000;
      max = max + pad;
      min = Math.max(0, min - pad);
    } else {
      const range = max - min;
      max = max + (range * 0.1);
      min = Math.max(0, min - (range * 0.1));
    }

    const safeRange = max - min || 1;

    const calculatedPoints = rawData.map((d: any, index: number) => {
      const x = plotLeft + (index * (plotWidth / Math.max(1, (rawData.length - 1))));
      const incomeY = plotBottom - (((d.in - min) / safeRange) * plotHeight);
      const expenseY = plotBottom - (((d.out - min) / safeRange) * plotHeight);
      return { ...d, x, incomeY: isNaN(incomeY) ? plotBottom : incomeY, expenseY: isNaN(expenseY) ? plotBottom : expenseY };
    });

    return { points: calculatedPoints, maxValue: max, minValue: min };
  }, [rawData, plotWidth, plotHeight]);

  if (loading || !snapshot) {
    return (
      <div className="report-card" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
        Loading cash flow chart...
      </div>
    );
  }

  const generateSmoothPath = (pts: {x: number, y: number}[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 10} ${pts[0].y}`;
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

  if (rawData.length === 0) {
    return (
      <div className="report-card" style={{ height: '400px' }}>
        <h3 className="report-section-title">CASH FLOW</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A8A8A' }}>
          No financial activity for this period.
        </div>
      </div>
    );
  }

  const incomePath = generateSmoothPath(points.map((p: any) => ({ x: p.x, y: p.incomeY })));
  const expensePath = generateSmoothPath(points.map((p: any) => ({ x: p.x, y: p.expenseY })));

  const handleInteraction = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const scaleX = viewBoxWidth / rect.width;
    const svgX = mouseX * scaleX;

    let closestPoint = points[0];
    let minDistance = Infinity;

    points.forEach((p: any) => {
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
      data: {
        label: closestPoint.label,
        in: closestPoint.in,
        out: closestPoint.out
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setIsHovered(true);
    handleInteraction(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setIsHovered(true);
    handleInteraction(e.touches[0].clientX);
  };

  return (
    <div className="report-card cash-flow-section">
      <div className="cash-flow-header">
        <h3 className="report-section-title">CASH FLOW</h3>
        <div className="cash-flow-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#2ECC71' }}></span> Income
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#E74C3C' }}></span> Expenses
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsHovered(false)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsHovered(false)}
        >
          {points.length > 1 && points.map((p: any, i: number) => {
            if (i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length/6)) === 0) {
              return (
                <text key={i} x={p.x} y={viewBoxHeight - 10} fill="#8A8A8A" fontSize="12" textAnchor="middle">
                  {p.label}
                </text>
              );
            }
            return null;
          })}

          <path d={incomePath} fill="none" stroke="#2ECC71" strokeWidth="3" opacity={isHovered ? 0.3 : 1} style={{ transition: 'opacity 0.3s' }} />
          <path d={expensePath} fill="none" stroke="#E74C3C" strokeWidth="3" opacity={isHovered ? 0.3 : 1} style={{ transition: 'opacity 0.3s' }} />

          {isHovered && hoverData && (
            <g className="hover-elements">
              <line 
                x1={hoverData.x} y1={plotTop} 
                x2={hoverData.x} y2={plotBottom} 
                stroke="#E3B873" strokeWidth="1" strokeDasharray="4 4" 
              />
              <circle cx={hoverData.x} cy={hoverData.incomeY} r="6" fill="#14171C" stroke="#2ECC71" strokeWidth="2" />
              <circle cx={hoverData.x} cy={hoverData.expenseY} r="6" fill="#14171C" stroke="#E74C3C" strokeWidth="2" />
            </g>
          )}
        </svg>

        {isHovered && hoverData && (
          <div 
            className="chart-tooltip glass-panel"
            style={{
              position: 'absolute',
              left: `max(10px, min(calc(${(hoverData.x / viewBoxWidth) * 100}% - 75px), calc(100% - 160px)))`,
              top: '20px',
              pointerEvents: 'none',
              padding: '12px',
              minWidth: '150px',
              zIndex: 10
            }}
          >
            <div style={{ color: '#E3B873', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
              {hoverData.data.label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
              <span style={{ color: '#2ECC71' }}>Income:</span>
              <span style={{ color: '#FFF' }}>₹{Math.round(hoverData.data.in).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: '#E74C3C' }}>Expenses:</span>
              <span style={{ color: '#FFF' }}>₹{Math.round(hoverData.data.out).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
