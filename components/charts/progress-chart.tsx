'use client';

import { cn } from '@/lib/utils';

interface ProgressChartProps {
  data: {
    label: string;
    value: number;
    maxValue?: number;
    color?: string;
  }[];
  title?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressChart({ data, title, showPercentage = true, className }: ProgressChartProps) {
  const maxValue = Math.max(...data.map(d => d.maxValue || d.value));

  const getGradientColor = (index: number) => {
    const colors = [
      'from-green-500 to-emerald-500',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-amber-500',
      'from-red-500 to-rose-500',
      'from-indigo-500 to-violet-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gradient">{title}</h3>
      )}
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = item.maxValue
            ? Math.round((item.value / item.maxValue) * 100)
            : Math.round((item.value / maxValue) * 100);

          return (
            <div
              key={item.label}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {showPercentage ? `${percentage}%` : item.value}
                </span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r',
                    item.color || getGradientColor(index)
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
