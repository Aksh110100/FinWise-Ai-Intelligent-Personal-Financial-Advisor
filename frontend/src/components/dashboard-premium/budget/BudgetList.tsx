import React, { useState, useEffect, useMemo } from 'react';
import { Search, MoreHorizontal, AlertCircle } from 'lucide-react';
import { FinWiseDropdown } from './BudgetSharedComponents';

interface BudgetListProps {
  budgets: any[];
  selectedMonth: string;
  onCategoryClick: (categoryName: string) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string, categoryName: string) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({ 
  budgets, 
  selectedMonth,
  onCategoryClick,
  onEditClick,
  onDeleteClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mounted, setMounted] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const budgetData = useMemo(() => {
    return budgets.map(b => {
      let status = 'ON TRACK';
      if (b.status === 'OVER_BUDGET') status = 'OVER BUDGET';
      else if (b.status === 'NEAR_LIMIT') status = 'NEAR LIMIT';
      else if (b.percentage >= 70) status = 'WATCH';

      return { ...b, status };
    });
  }, [budgets]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    budgets.forEach(b => cats.add(b.category));
    return Array.from(cats);
  }, [budgets]);

  const filteredBudgets = budgetData.filter(b => {
    const matchSearch = b.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'All' || b.category === categoryFilter;
    let matchStatus = true;
    if (statusFilter === 'On Track') matchStatus = b.status === 'ON TRACK' || b.status === 'WATCH';
    if (statusFilter === 'Near Limit') matchStatus = b.status === 'NEAR LIMIT';
    if (statusFilter === 'Over Budget') matchStatus = b.status === 'OVER BUDGET';
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-secondary)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
          YOUR BUDGETS
        </h2>
      </div>

      <div className="budget-filters">
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="SEARCH BUDGETS..." 
            className="budget-search-input"
            style={{ paddingLeft: '36px', paddingRight: searchTerm ? '60px' : '16px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '12px', top: '10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              CLEAR
            </button>
          )}
        </div>
        
        <div style={{ width: '180px' }}>
          <FinWiseDropdown 
            value={categoryFilter}
            options={['All', ...categories]}
            onChange={setCategoryFilter}
            placeholder="ALL CATEGORIES"
          />
        </div>
        
        <div style={{ width: '160px' }}>
          <FinWiseDropdown 
            value={statusFilter}
            options={['All', 'On Track', 'Near Limit', 'Over Budget']}
            onChange={setStatusFilter}
            placeholder="STATUS"
          />
        </div>
      </div>

      <div className="budget-scrollable">
        <div className="budget-categories-grid">
          {filteredBudgets.map((b, i) => (
            <div 
              key={b.id} 
              className={`budget-category-row ${mounted ? 'budget-anim-enter' : ''}`}
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => onCategoryClick(b.category)}
            >
              <div style={{ flex: 1 }}>
                <div className="budget-category-header">
                  <span className="budget-category-name">{b.category}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="budget-category-stats">
                      ₹{b.spent.toLocaleString('en-IN')} / ₹{b.limit.toLocaleString('en-IN')}
                    </span>
                    <div style={{ position: 'relative' }}>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === b.id ? null : b.id);
                        }}
                        style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <MoreHorizontal size={16} />
                      </div>
                      
                      {activeDropdownId === b.id && (
                        <div 
                          className="budget-action-dropdown anim-fade-in"
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            background: '#151515',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            padding: '4px',
                            zIndex: 100,
                            minWidth: '120px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div 
                            style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', color: 'var(--text-primary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                              onEditClick(b.id);
                              setActiveDropdownId(null);
                            }}
                          >
                            Edit Limit
                          </div>
                          <div 
                            style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', color: '#C46C6C' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,108,108,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                              onDeleteClick(b.id, b.category);
                              setActiveDropdownId(null);
                            }}
                          >
                            Delete Budget
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="budget-progress-container">
                  <div 
                    className={`budget-progress-fill ${b.percentage >= 100 ? 'status-over' : (b.percentage >= 90 ? 'status-near' : '')}`}
                    style={{ width: mounted ? `${Math.min(b.percentage, 100)}%` : '0%' }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: b.percentage >= 100 ? '#C46C6C' : 'var(--text-secondary)' }}>
                    {Math.round(b.percentage)}%
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {b.percentage >= 100 && <AlertCircle size={14} color="#C46C6C" />}
                    <span style={{ fontSize: '0.85rem', color: b.percentage >= 100 ? '#C46C6C' : 'var(--text-secondary)' }}>
                      {b.percentage >= 100 ? `₹${Math.abs(b.remaining).toLocaleString('en-IN')} over budget` : `₹${b.remaining.toLocaleString('en-IN')} remaining`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredBudgets.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No budgets found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
