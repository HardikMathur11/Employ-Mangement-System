import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = true }) => {
  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-xl shadow-card
      border border-gray-100 dark:border-gray-700
      ${hover ? 'transition-all duration-200 hover:shadow-soft' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default GlassCard;