import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

const colorMap: Record<NonNullable<BadgeProps['color']>, string> = {
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const Badge: React.FC<BadgeProps> = ({ children, color = 'gray', className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;


