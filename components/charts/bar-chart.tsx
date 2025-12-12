'use client';

import { cn } from '@/lib/utils';

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  title?: string;
  height?: number;
  className?: string;
  showValues?: boolean;
}

export function BarChart({
  data,
  title,
  height = 200,
  className,
  showValues = true,
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  const getGradientColor = (index: number) => {
    const colors = [
      'from-green-500 to-emerald-500',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-amber-500',
      'from-red-500 to-rose-500',
      'from-indigo-500 to-violet-500',
      'from-teal-500 to-cyan-500',
      'from-yellow-500 to-orange-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gradient">{title}</h3>
      )}
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return (
            <div
              key={item.label}
              className="flex-1 flex flex-col items-center gap-2 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative w-full flex flex-col items-center" style={{ height: height - 40 }}>
                {showValues && (
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {item.value}
                  </span>
                )}
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    className={cn(
                      'w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ease-out bg-gradient-to-t',
                      item.color || getGradientColor(index)
                    )}
                    style={{ height: `${barHeight}%`, minHeight: barHeight > 0 ? '4px' : '0' }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
