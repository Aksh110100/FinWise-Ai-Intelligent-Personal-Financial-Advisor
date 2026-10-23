import React, { useEffect, useState } from 'react';
import '../../styles/reports.css';
import { ReportHero } from '../../components/reports/ReportHero';
import { ReportControls } from '../../components/reports/ReportControls';
import { ReportSnapshot } from '../../components/reports/ReportSnapshot';
import { CashFlowChart } from '../../components/reports/CashFlowChart';
import { ExpenseDistribution } from '../../components/reports/ExpenseDistribution';
import { SavingsAndGoals } from '../../components/reports/SavingsAndGoals';
import { FinancialHealthScore } from '../../components/reports/FinancialHealthScore';
import { ReportPreviewArea } from '../../components/reports/ReportPreviewArea';
import { RecentReportsList } from '../../components/reports/RecentReportsList';
import { ReportPreviewModal } from '../../components/reports/ReportPreviewModal';
import { ReportProvider, useReportContext } from '../../contexts/ReportContext';


const ReportsContent: React.FC = () => {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const { error } = useReportContext();

  return (
    <div className="reports-page-wrapper">
      <div className="reports-content-grid">
        <ReportHero />
        <ReportControls />

        {error ? (
          <div className="report-error-state" style={{ color: '#E74C3C', padding: '2rem', textAlign: 'center', gridColumn: '1 / -1', background: '#14171C', borderRadius: '12px' }}>
            {error}
          </div>
        ) : (
          <>
            <div className="anim-fade-up delay-1">
              <ReportSnapshot />
            </div>

            <div className="anim-fade-up delay-2">
              <CashFlowChart />
            </div>

            <div className="anim-fade-up delay-3">
              <ExpenseDistribution />
            </div>

            <div className="anim-fade-up delay-4">
              <SavingsAndGoals />
            </div>

            <div className="anim-fade-up delay-5">
              <FinancialHealthScore />
            </div>

            <div className="anim-fade-up delay-6">
              <ReportPreviewArea onOpenPreview={() => setIsPreviewModalOpen(true)} />
            </div>

            <div className="anim-fade-up delay-7">
              <RecentReportsList onOpenPreview={() => setIsPreviewModalOpen(true)} />
            </div>
          </>
        )}
      </div>

      <ReportPreviewModal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
      />
    </div>
  );
};

const Reports: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ReportProvider>
      <ReportsContent />
    </ReportProvider>
  );
};

export default Reports;
