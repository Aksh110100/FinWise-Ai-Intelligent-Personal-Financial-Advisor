import React, { useRef, useState, useEffect, useMemo } from 'react';
import { getToken } from '../../../utils/auth';

const SVG_WIDTH = 800;
const SVG_HEIGHT = 240;

interface ExpenseGraphProps {
  filters: any;
}

export const ExpenseGraph: React.FC<ExpenseGraphProps> = ({ filters }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointsData, setPointsData] = useState<any[]>([]);
  
  const [trackerState, setTrackerState] = useState<{ svgX: number; svgY: number; dataIndex: number; value: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        const queryParams = new URLSearchParams();
        queryParams.append('range', filters.dateRange || '1M');
        if (filters.category && filters.category !== 'All categories') queryParams.append('categoryName', filters.category);
        if (filters.paymentMethod && filters.paymentMethod !== 'All') queryParams.append('paymentMethod', filters.paymentMethod);
        
        const res = await fetch(`http://localhost:5000/api/expenses/analytics/spending-overview?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const json = await res.json();
        
        if (isMounted) {
          if (json.success) {
            setPointsData(json.points || []);
          } else {
            setError(json.message || 'Failed to fetch graph data');
          }
        }
      } catch (err) {
        if (isMounted) setError('Network error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchAnalytics();
    
    const handleRefresh = () => {
      fetchAnalytics();
    };

    window.addEventListener('expenseAdded', handleRefresh);
    window.addEventListener('expenseDeleted', handleRefresh);
    window.addEventListener('expenseUpdated', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('expenseAdded', handleRefresh);
      window.removeEventListener('expenseDeleted', handleRefresh);
      window.removeEventListener('expenseUpdated', handleRefresh);
    };
  }, [filters]);

  if (error) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-negative)', opacity: 0.8 }}>Unable to load spending data</p>
      </div>
    );
  }

  if (loading && pointsData.length === 0) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Loading...</p>
      </div>
    );
  }

  if (pointsData.length === 0) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>No expense data available yet.</p>
      </div>
    );
  }

  // Extract max value
  const maxValue = Math.max(...pointsData.map(d => Number(d.total))) * 1.2 || 1;

  const points = pointsData.map((d, i) => {
    const x = pointsData.length === 1 ? SVG_WIDTH / 2 : (i / (pointsData.length - 1)) * SVG_WIDTH;
    const y = SVG_HEIGHT - (Number(d.total) / maxValue) * SVG_HEIGHT;
    return { x, y, ...d };
  });

  const pathData = `M 0,${SVG_HEIGHT} ` + points.map((p, i) => {
    if (i === 0) return `L ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `C ${cpX},${prev.y} ${cpX},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !pathRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    const svgX = ratio * SVG_WIDTH;

    let minL = 0;
    let maxL = pathRef.current.getTotalLength();
    let targetL = maxL / 2;
    let point = pathRef.current.getPointAtLength(targetL);
    
    // Fast binary search to find length matching the mouse's X coordinate
    for (let i = 0; i < 12; i++) {
      if (point.x < svgX) minL = targetL;
      else maxL = targetL;
      targetL = (minL + maxL) / 2;
      point = pathRef.current.getPointAtLength(targetL);
    }
    
    const dataIndex = Math.min(Math.max(0, Math.round(ratio * (points.length - 1))), points.length - 1);
    const interpolatedValue = Math.round(maxValue - (point.y / SVG_HEIGHT) * maxValue);
    
    setTrackerState({ svgX, svgY: point.y, dataIndex, value: interpolatedValue });
  };

  const handleMouseLeave = () => {
    setTrackerState(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div 
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: '240px', marginTop: '10px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
      <svg width="100%" height="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} preserveAspectRatio="none">
        
        {/* Subtle grid lines */}
        <line x1="0" y1={SVG_HEIGHT} x2={SVG_WIDTH} y2={SVG_HEIGHT} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1="0" y1={SVG_HEIGHT / 2} x2={SVG_WIDTH} y2={SVG_HEIGHT / 2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="0" x2={SVG_WIDTH} y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />

        {/* The line */}
        <path 
          ref={pathRef}
          d={pathData} 
          fill="none" 
          stroke="var(--text-primary)" 
          strokeWidth="3"
          style={{ filter: 'drop-shadow(0px 8px 16px rgba(255,255,255,0.2))' }}
        />

        {/* Tracker */}
        {trackerState && (
          <g transform={`translate(${trackerState.svgX}, 0)`}>
            <line 
              x1="0" y1="0" x2="0" y2={SVG_HEIGHT} 
              stroke="var(--accent-gold)" 
              strokeWidth="1" 
              strokeDasharray="4 4" 
            />
            <circle cx="0" cy={trackerState.svgY} r="6" fill="#050505" stroke="var(--accent-gold)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* Tooltip HTML for better text rendering */}
      {trackerState && (
        <div 
          style={{
            position: 'absolute',
            left: `${(trackerState.svgX / SVG_WIDTH) * 100}%`,
            top: '-20px',
            transform: `translate(${trackerState.svgX > SVG_WIDTH / 2 ? '-110%' : '10%'}, -100%)`,
            background: 'rgba(12,12,12,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 16px',
            borderRadius: '8px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
            minWidth: '160px',
            transition: 'transform 0.1s ease-out'
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>
            {new Date(points[trackerState.dataIndex].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total spent</span>
            <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              ₹{trackerState.value.toLocaleString('en-IN')}
            </div>
          </div>
          
          {points[trackerState.dataIndex].expenses.length > 0 ? (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              {points[trackerState.dataIndex].expenses.map((exp: any) => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{exp.description}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>₹{Number(exp.amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No expenses
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
