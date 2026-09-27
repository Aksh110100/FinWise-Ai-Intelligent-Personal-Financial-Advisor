import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useBudgets } from '../../hooks/useBudgets';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { BudgetOverview } from '../../components/dashboard-premium/budget/BudgetOverview';
import { BudgetList } from '../../components/dashboard-premium/budget/BudgetList';
import { BudgetGraph } from '../../components/dashboard-premium/budget/BudgetGraph';
import { BudgetAIAdvisor, RoomToSave } from '../../components/dashboard-premium/budget/BudgetAIAdvisor';
import { RecentBudgetActivity, EmptyBudgetState, DeleteConfirmModal } from '../../components/dashboard-premium/budget/BudgetSharedComponents';
import { CreateBudgetPanel, CategoryDetailPanel } from '../../components/dashboard-premium/budget/BudgetPanels';
import '../../styles/budget.css';

const Budget: React.FC = () => {
  const { applyAIOptimization } = useDashboard();
  
  const [toastConfig, setToastConfig] = useState<{ message: string; type: 'success' | 'decline' } | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  const filterMonth = currentDate.getMonth() + 1;
  const filterYear = currentDate.getFullYear();
  const selectedMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; categoryName: string }>({
    isOpen: false, id: '', categoryName: ''
  });

  const { budgets, summary, analytics, loading, addBudget, updateBudget, deleteBudget } = useBudgets({ month: filterMonth, year: filterYear });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCreateBudget = async (budgetData: any) => {
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, { amount: budgetData.limit });
        setToastConfig({ message: 'Budget Updated', type: 'success' });
      } else {
        await addBudget(budgetData);
        setToastConfig({ message: 'Budget Created', type: 'success' });
      }
      setTimeout(() => setToastConfig(null), 3500);
      setEditingBudget(null);
    } catch (e: any) {
      setToastConfig({ message: e.message || 'Failed to save budget', type: 'decline' });
      setTimeout(() => setToastConfig(null), 3500);
    }
  };

  const handleAIOptimization = () => {
    applyAIOptimization('shopping', 1200);
    setToastConfig({ message: 'Budget Optimized', type: 'success' });
    setTimeout(() => setToastConfig(null), 3500);
  };

  const handleDeleteConfirm = async () => {
    await deleteBudget(deleteConfirm.id);
    setDeleteConfirm({ isOpen: false, id: '', categoryName: '' });
  };

  const currentBudgets = budgets;

  // Calculate spent for detail panel
  const getSpentForCategory = (category: string) => {
    const budget = budgets.find(b => b.category.toLowerCase() === category.toLowerCase());
    return budget ? budget.spent : 0;
  };

  const totalBudget = summary?.totalBudget || 0;
  const totalSpent = summary?.totalSpent || 0;

  return (
    <div className="budget-page-container">
      
      {/* Header */}
      <div className="budget-header-flex anim-fade-up">
        <div>
          <h1 className="budget-title">BUDGET</h1>
          <div className="budget-subtitle" style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            "Give every rupee a purpose."
          </div>
          <div className="budget-subtitle">
            Set spending limits, track progress, and let FinWise AI help you stay on plan.
          </div>
        </div>
        
        <button 
          onClick={() => setIsCreatePanelOpen(true)}
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
            transition: 'var(--transition-smooth)'
          }}
        >
          + CREATE BUDGET
        </button>
      </div>

      {/* Month Selector */}
      <div className="anim-fade-up" style={{ animationDelay: '50ms' }}>
        <div className="budget-month-selector">
          <button className="budget-month-btn" onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          
          <div className="budget-month-text">
            <span>{selectedMonth.toUpperCase()}</span>
            {isCurrentMonth && <span className="budget-month-indicator">THIS MONTH</span>}
          </div>
          
          <button className="budget-month-btn" onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {currentBudgets.length === 0 ? (
        <EmptyBudgetState onCreateClick={() => setIsCreatePanelOpen(true)} />
      ) : (
        <>
          <div className="anim-fade-up" style={{ animationDelay: '100ms' }}>
            <BudgetOverview budgets={budgets} summary={summary} selectedMonth={selectedMonth} />
          </div>

          <div className="budget-row anim-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="budget-col-main">
              <BudgetList 
                budgets={budgets}
                selectedMonth={selectedMonth}
                onCategoryClick={setDetailCategory}
                onEditClick={(id) => {
                  const budgetToEdit = budgets.find(b => b.id === id);
                  if (budgetToEdit) {
                    setEditingBudget(budgetToEdit);
                    setIsCreatePanelOpen(true);
                  }
                }}
                onDeleteClick={(id, categoryName) => setDeleteConfirm({ isOpen: true, id, categoryName })}
              />
              <BudgetGraph analytics={analytics} />
            </div>
            
            <div className="budget-col-side" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <BudgetAIAdvisor onOptimize={handleAIOptimization} />
              <RoomToSave />
              <RecentBudgetActivity />
            </div>
          </div>
        </>
      )}

      {/* Panels & Modals */}
      <CreateBudgetPanel 
        isOpen={isCreatePanelOpen}
        onClose={() => {
          setIsCreatePanelOpen(false);
          setTimeout(() => setEditingBudget(null), 400); // clear after animation
        }}
        onSubmit={handleCreateBudget}
        selectedMonth={selectedMonth}
        initialData={editingBudget}
      />

      <CategoryDetailPanel 
        category={detailCategory || ''}
        onClose={() => setDetailCategory(null)}
        budgets={budgets}
        selectedMonth={selectedMonth}
        spent={detailCategory ? getSpentForCategory(detailCategory) : 0}
      />

      <DeleteConfirmModal 
        isOpen={deleteConfirm.isOpen}
        categoryName={deleteConfirm.categoryName}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', categoryName: '' })}
      />

      {/* Toast Notification */}
      {toastConfig && (
        <div className="glass-toast">
          {toastConfig.type === 'success' ? (
            <Check size={18} color="var(--text-positive)" />
          ) : (
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '10px', height: '2px', backgroundColor: 'var(--text-secondary)' }}></div>
            </div>
          )}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.95rem' }}>{toastConfig.message}</span>
        </div>
      )}
    </div>
  );
};

export default Budget;
