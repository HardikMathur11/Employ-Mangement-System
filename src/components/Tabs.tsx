import React from 'react';

interface TabsProps {
  tabs: { key: string; label: React.ReactNode; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {t.label}
                {typeof t.count === 'number' && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-800">
                    {t.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;


