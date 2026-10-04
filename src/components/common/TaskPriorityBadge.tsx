import React from 'react';
import { TaskPriority } from '../../types';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface TaskPriorityBadgeProps {
  priority?: TaskPriority | string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const getPriorityConfig = (priority?: string) => {
  switch (priority) {
    case 'Haute':
      return {
        label: 'Haute',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70',
        dotClass: 'bg-rose-500',
        dotPulseClass: 'bg-rose-400',
        icon: ArrowUp,
        iconColor: 'text-rose-600',
        textClass: 'text-rose-750 font-black',
        chipClass: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    case 'Basse':
      return {
        label: 'Basse',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70',
        dotClass: 'bg-emerald-500',
        dotPulseClass: 'bg-emerald-400',
        icon: ArrowDown,
        iconColor: 'text-emerald-600',
        textClass: 'text-emerald-750 font-bold',
        chipClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    case 'Moyenne':
    default:
      return {
        label: 'Moyenne',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70',
        dotClass: 'bg-amber-500',
        dotPulseClass: 'bg-amber-400',
        icon: Minus,
        iconColor: 'text-amber-600',
        textClass: 'text-amber-850 font-bold',
        chipClass: 'text-amber-800 bg-amber-50 border-amber-200',
      };
  }
};

export const TaskPriorityBadge: React.FC<TaskPriorityBadgeProps> = ({
  priority,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const config = getPriorityConfig(priority);
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2 h-2',
  };

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-md border shadow-3xs select-none transition-colors ${config.badgeClass} ${sizeClasses[size]} ${className}`}
      title={`Priorité : ${config.label}`}
    >
      <span className="relative flex items-center justify-center">
        {priority === 'Haute' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotPulseClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSizes[size]} ${config.dotClass}`} />
      </span>

      {showIcon && <Icon className={`${iconSizes[size]} ${config.iconColor} stroke-[2.5]`} />}
      <span>{config.label}</span>
    </span>
  );
};

export default TaskPriorityBadge;
