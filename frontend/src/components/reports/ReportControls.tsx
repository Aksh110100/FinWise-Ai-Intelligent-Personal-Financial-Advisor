import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { useReportContext } from '../../contexts/ReportContext';

interface CustomDropdownProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className={`custom-dropdown-container ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <button className="custom-dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedLabel}</span>
        <span className="custom-dropdown-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map(opt => (
            <div 
              key={opt.value} 
              className={`custom-dropdown-item ${opt.value === value ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ReportControls: React.FC = () => {
  const { period, setPeriod, compare, setCompare, reportType, setReportType } = useReportContext();

  const reportTypeOptions = [
    { label: 'Financial Overview', value: 'Financial Overview' },
  ];

  const periodOptions = [
    { label: 'This Month', value: 'This Month' },
    { label: 'Last Month', value: 'Last Month' },
    { label: 'Last 3 Months', value: 'Last 3 Months' },
    { label: 'Last 6 Months', value: 'Last 6 Months' },
    { label: 'This Year', value: 'This Year' },
  ];

  const compareOptions = [
    { label: 'Compare: None', value: 'None' },
    { label: 'Compare: Previous Month', value: 'Previous Month' },
    { label: 'Compare: Previous Period', value: 'Previous Period' },
    { label: 'Compare: Previous Year', value: 'Previous Year' },
  ];

  return (
    <div className="report-controls-bar">
      <div className="report-control-group">
        <CustomDropdown 
          value={reportType} 
          options={reportTypeOptions} 
          onChange={setReportType} 
        />
        <CustomDropdown 
          value={period} 
          options={periodOptions} 
          onChange={setPeriod} 
        />
        <CustomDropdown 
          value={compare} 
          options={compareOptions} 
          onChange={setCompare} 
        />
      </div>

      <button className="btn-primary report-generate-btn">
        <Download size={18} /> GENERATE REPORT
      </button>
    </div>
  );
};
