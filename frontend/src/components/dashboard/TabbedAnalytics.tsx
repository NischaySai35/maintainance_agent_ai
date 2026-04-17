'use client';
import { useState, memo } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabbedAnalyticsProps {
  tabs: Tab[];
  children: Record<string, React.ReactNode>;
}

const TabbedAnalytics = ({ tabs, children }: TabbedAnalyticsProps) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');

  return (
    <div className="card">
      {/* Tab bar */}
      <div className="card-header">
        <div className="tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body min-h-[460px] flex flex-col">
        {children[activeTab] ?? null}
      </div>
    </div>
  );
};

export default memo(TabbedAnalytics);
