import React, { useState, useEffect } from 'react';

// Components
import { DashboardHeader } from '../../components/dashboard-premium/DashboardHeader';
import { KPIGrid } from '../../components/dashboard-premium/KPIGrid';
import { MainGraph } from '../../components/dashboard-premium/MainGraph';
import { SpendingDonut } from '../../components/dashboard-premium/SpendingDonut';
import { FinancialHealth } from '../../components/dashboard-premium/FinancialHealth';
import { AIInsightCard } from '../../components/dashboard-premium/AIInsightCard';
import { SavingsProgress } from '../../components/dashboard-premium/SavingsProgress';
import { InvestmentOverview } from '../../components/dashboard-premium/InvestmentOverview';
import { GoalList } from '../../components/dashboard-premium/GoalList';
import { QuickActions } from '../../components/dashboard-premium/QuickActions';
import { QuickActionPanel, ActionType } from '../../components/dashboard-premium/QuickActionPanel';
import { useDashboard } from '../../context/DashboardContext';
import { Check } from 'lucide-react';

const Overview: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [toastConfig, setToastConfig] = useState<{ message: string; type: 'success' | 'decline' } | null>(null);

  const { refresh } = useDashboard();

  useEffect(() => {
    window.scrollTo(0, 0);
    const userData = localStorage.getItem('finwise_user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserName(parsed.name || 'User');
      } catch (e) {
        setUserName('User');
      }
    } else {
      setUserName('User');
    }
  }, []);

  const handleActionSuccess = (_data: any, _actionType: ActionType) => {
    // After a quick action succeeds, refresh dashboard data from the API
    refresh();
    setToastConfig({ message: 'Action completed successfully', type: 'success' });
    setTimeout(() => setToastConfig(null), 3500);
  };

  const handleAIOptimization = (_type: string) => {
    setToastConfig({ message: 'Insight acknowledged', type: 'success' });
    setTimeout(() => setToastConfig(null), 3500);
  };

  const handleAIDecline = () => {
    setToastConfig({ message: 'Insight dismissed', type: 'decline' });
    setTimeout(() => setToastConfig(null), 3500);
  };

  return (
    <>
      <div className="dashboard-content-grid">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <DashboardHeader userName={userName} />
          <div style={{ paddingTop: '16px' }}>
            <QuickActions onActionClick={(a) => setActiveAction(a as ActionType)} />
          </div>
        </div>
        
        <KPIGrid />

        <div className="dashboard-row-2">
          <MainGraph />
          <SpendingDonut />
        </div>

        <div className="dashboard-row-3">
          <FinancialHealth />
          <AIInsightCard onActionClick={handleAIOptimization} onDeclineClick={handleAIDecline} />
          <SavingsProgress />
        </div>

        <div className="dashboard-row-2">
          <InvestmentOverview />
          <GoalList />
        </div>

      </div>

      <QuickActionPanel 
        isOpen={activeAction !== null} 
        activeAction={activeAction} 
        onClose={() => setActiveAction(null)} 
        onSuccess={handleActionSuccess} 
      />
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
    </>
  );
};

export default Overview;
