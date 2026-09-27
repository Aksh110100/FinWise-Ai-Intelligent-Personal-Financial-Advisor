import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDelayedUnmount } from '../../../hooks/useDelayedUnmount';
import { X } from 'lucide-react';
import { Transaction } from '../../../data/mockTransactions';

interface TransactionDetailPanelProps {
  transaction: Transaction | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const TransactionDetailPanel: React.FC<TransactionDetailPanelProps> = ({ transaction, onClose, onDelete }) => {
  const { shouldRender, isClosing } = useDelayedUnmount(!!transaction, 350);
  const [localTx, setLocalTx] = React.useState<Transaction | null>(transaction);

  useEffect(() => {
    if (transaction) {
      setLocalTx(transaction);
    }
  }, [transaction]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (transaction) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [transaction, onClose]);
  
  if (!shouldRender || !localTx) return null;

  return createPortal(
    <div className={`qa-overlay center opening ${isClosing ? 'closing' : ''}`} onClick={onClose}>
      {/* Panel */}
      <div className={`qa-panel floating opening ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="qa-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="qa-panel-content">
          <div className="qa-form-header">
            <h2>TRANSACTION DETAILS</h2>
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>MERCHANT</div>
            <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{localTx.merchant}</div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>AMOUNT</div>
            <div style={{ fontFamily: 'var(--font-primary)', fontSize: '2rem', color: localTx.type === 'expense' ? 'var(--text-primary)' : 'var(--text-positive)' }}>
              {localTx.type === 'expense' ? '−' : '+'} ₹{localTx.amount.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>CATEGORY</div>
            <div style={{ color: 'var(--text-primary)' }}>{localTx.category}</div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>DATE</div>
            <div style={{ color: 'var(--text-primary)' }}>
              {new Date(localTx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>PAYMENT METHOD</div>
            <div style={{ color: 'var(--text-primary)' }}>{localTx.paymentMethod}</div>
          </div>

          {localTx.note && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>NOTE</div>
              <div style={{ color: 'var(--text-primary)' }}>{localTx.note}</div>
            </div>
          )}

          {onDelete && (
            <button 
              className="qa-btn-danger" 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this expense?')) {
                  onDelete(localTx.id);
                }
              }}
            >
              DELETE EXPENSE
            </button>
          )}
          
        </div>
      </div>
    </div>,
    document.body
  );
};
