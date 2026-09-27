import React, { useState, useEffect } from 'react';
import '../../styles/expenses.css';

// Components
import { ExpensesSummary } from '../../components/dashboard-premium/expenses/ExpensesSummary';
import { ExpenseFilters, FilterState } from '../../components/dashboard-premium/expenses/ExpenseFilters';
import { ExpenseGraph } from '../../components/dashboard-premium/expenses/ExpenseGraph';
import { CategoryAnalysis } from '../../components/dashboard-premium/expenses/CategoryAnalysis';
import { TransactionList } from '../../components/dashboard-premium/expenses/TransactionList';
import { AIExpenseAnalysis } from '../../components/dashboard-premium/expenses/AIExpenseAnalysis';
import { TransactionDetailPanel } from '../../components/dashboard-premium/expenses/TransactionDetailPanel';
import { QuickActionPanel, ActionType } from '../../components/dashboard-premium/QuickActionPanel';

import { Plus } from 'lucide-react';
import { Transaction } from '../../data/mockTransactions';
import { useExpenses } from '../../hooks/useExpenses';

const Expenses: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All categories',
    paymentMethod: 'All',
    dateRange: '1M'
  });

  const { expenses, summary, loading, error, addExpense, deleteExpense } = useExpenses(filters);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleClearFilters = () => {
    setFilters({ search: '', category: 'All categories', paymentMethod: 'All', dateRange: '1M' });
  };

  const handleAddExpenseSuccess = async (data: any, actionType: ActionType) => {
    if (actionType === 'expense') {
      await addExpense(data);
    }
  };

  // Convert backend data to the shape expected by existing components
  const mappedTransactions = expenses.map(e => ({
    id: e.id,
    merchant: e.merchant || e.Category?.name || 'Unknown',
    category: e.Category?.name || 'Uncategorized',
    date: e.date,
    paymentMethod: e.paymentMethod,
    amount: parseFloat(e.amount),
    type: 'expense' as const,
    note: e.description || e.notes || ''
  }));

  const mappedDashboardData = {
    overview: {
      monthlyExpenses: `₹${summary?.totalSpending?.toLocaleString('en-IN') || '0'}`,
    },
    spending: (summary?.categoryBreakdown || []).map((cat: any) => ({
      category: cat.name,
      amount: `₹${cat.amount.toLocaleString('en-IN')}`
    })),
    insights: []
  };

  // Convert spending to proportional data
  const categoryData = (summary?.categoryBreakdown || []).map((cat: any) => {
    const totalExp = summary?.totalSpending || 0;
    const percentage = totalExp > 0 ? Math.round((cat.amount / totalExp) * 100) : 0;
    return {
      category: cat.name,
      amount: `₹${cat.amount.toLocaleString('en-IN')}`,
      percentage
    };
  }).sort((a: any, b: any) => b.percentage - a.percentage);

  if (loading && expenses.length === 0 && !summary) {
    return (
      <div className="expenses-page-container" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="qa-ambient-glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading expenses...</p>
      </div>
    );
  }

  if (error && expenses.length === 0) {
    return (
      <div className="expenses-page-container" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-negative)' }}>{error}</p>
        <button className="qa-btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
          RETRY
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="expenses-page-container anim-stagger-1">
      
      <div className="expenses-header">
        <div className="expenses-title-group">
          <h1>EXPENSES</h1>
          <p>Track where your money goes.</p>
        </div>
        <button className="premium-btn primary" onClick={() => setActiveAction('expense')}>
          <Plus size={16} />
          <span>ADD EXPENSE</span>
        </button>
      </div>

      <div className="anim-stagger-2">
        <ExpensesSummary data={mappedDashboardData} transactions={mappedTransactions} />
      </div>

      <div className="anim-stagger-3" style={{ position: 'relative', zIndex: 10 }}>
        <ExpenseFilters 
          filters={filters} 
          onFilterChange={setFilters} 
          onClearFilters={handleClearFilters} 
        />
      </div>

      <div className="expenses-main-grid anim-stagger-4">
        {/* Graph Section */}
        <div className="expenses-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-header">SPENDING OVERVIEW</div>
          <ExpenseGraph filters={filters} />
        </div>

        {/* Category Analysis */}
        <div className="expenses-panel">
          <div className="panel-header">WHERE YOUR MONEY GOES</div>
          {categoryData.length > 0 ? (
            <CategoryAnalysis data={categoryData} />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No categories for this period</div>
          )}
        </div>

        {/* AI Analysis */}
        <div className="expenses-panel">
          <div className="panel-header">FINWISE AI ANALYSIS</div>
          <AIExpenseAnalysis filters={filters} />
        </div>
      </div>

      <div className="anim-stagger-4" style={{ animationDelay: '0.5s' }}>
        <TransactionList 
          transactions={mappedTransactions} 
          filters={filters} 
          onTransactionClick={setSelectedTx} 
        />
      </div>
      </div>

      <TransactionDetailPanel 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)} 
        onDelete={async (id) => {
          await deleteExpense(id);
          setSelectedTx(null);
        }}
      />

      <QuickActionPanel 
        isOpen={activeAction !== null} 
        activeAction={activeAction} 
        onClose={() => setActiveAction(null)} 
        onSuccess={handleAddExpenseSuccess} 
      />
    </>
  );
};

export default Expenses;
