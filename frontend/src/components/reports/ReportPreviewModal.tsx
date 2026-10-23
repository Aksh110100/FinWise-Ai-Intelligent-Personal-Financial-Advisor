import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { useReportContext } from '../../contexts/ReportContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportPreviewModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { snapshot, period, loading } = useReportContext();
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const handleDownload = () => {
    window.open(`/api/reports/overview/pdf?period=${period}`, '_blank');
  };

  const getDocValue = (key: 'netIncome' | 'totalExpenses' | 'savings') => {
    if (loading || !snapshot) return '...';
    return `₹${Math.round(snapshot.summary[key]).toLocaleString('en-IN')}`;
  };

  const getSavingsRate = () => {
    if (loading || !snapshot) return '...';
    return `${Number(snapshot?.summary?.savingsRate || 0).toFixed(1)}%`;
  };

  const score = snapshot?.financialHealth?.score || 0;
  const healthLabel = snapshot?.financialHealth?.label || '';
  const spendingSignal = snapshot?.spendingSignal || '';

  return createPortal(
    <div className={`report-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="report-modal-content" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header">
          <div>
            <h4 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-primary)' }}>Financial Intelligence Report</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{period.toUpperCase()}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body doc-mock" style={{ padding: '40px', background: 'var(--bg-tertiary)' }}>
          
          <div className="doc-header">
            <div className="doc-title" style={{ display: 'flex', alignItems: 'center' }}>
               <img src="/logo.png" alt="FinWise AI" style={{ height: '56px', objectFit: 'contain', marginLeft: '-8px' }} />
            </div>
            <div className="doc-subtitle" style={{ color: 'var(--accent-gold)' }}>Financial Intelligence Report</div>
            <div className="doc-subtitle" style={{ marginTop: '16px', fontWeight: 600 }}>{period.toUpperCase()}</div>
          </div>
          
          <div style={{ marginBottom: '32px', fontSize: '1.2rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            Financial Overview
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
            <div>
              <div className="doc-row">
                <span className="doc-label">Net Income</span>
                <span className="doc-value">{getDocValue('netIncome')}</span>
              </div>
              <div className="doc-row">
                <span className="doc-label">Expenses</span>
                <span className="doc-value">{getDocValue('totalExpenses')}</span>
              </div>
              <div className="doc-row">
                <span className="doc-label">Savings</span>
                <span className="doc-value">{getDocValue('savings')}</span>
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Savings Rate</div>
               <div style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-primary)' }}>{getSavingsRate()}</div>
            </div>
          </div>

          <div style={{ marginBottom: '32px', fontSize: '1.2rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            Key Insights
          </div>

          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            <p style={{ marginBottom: '16px' }}>Your financial health score is currently <strong>{score}/100 ({healthLabel})</strong>.</p>
            <p>{spendingSignal}</p>
          </div>

        </div>

        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: 'rgba(10, 10, 10, 0.9)' }}>
          <button className="btn-secondary" onClick={onClose}>CLOSE</button>
          <button className="btn-primary" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> DOWNLOAD PDF
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
