import React from 'react';
import { Download } from 'lucide-react';
import { useReportContext } from '../../contexts/ReportContext';

interface Props {
  onOpenPreview: () => void;
}

export const RecentReportsList: React.FC<Props> = ({ onOpenPreview }) => {
  const { snapshot, loading } = useReportContext();

  if (loading || !snapshot) {
    return (
      <div className="report-section-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A8A' }}>
        Loading recent reports...
      </div>
    );
  }

  const recentReports = snapshot.recentReports || [];

  return (
    <div className="report-section-card">
      <h3 className="report-section-title">RECENT REPORTS</h3>
      
      {recentReports.length === 0 ? (
        <div style={{ padding: '2rem 0', color: '#8A8A8A', textAlign: 'center' }}>
          No recent reports found. Generate one to see it here.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="recent-reports-table">
            <thead>
              <tr>
                <th>Report Period</th>
                <th>Type</th>
                <th>Generated On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report: any) => (
                <tr key={report.id}>
                  <td style={{ fontWeight: 500 }}>{report.period}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{report.type}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{report.date}</td>
                  <td>
                    <button className="recent-action-btn" onClick={onOpenPreview}>VIEW</button>
                    <button className="recent-action-btn"><Download size={14} style={{ marginBottom: '-2px' }} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
