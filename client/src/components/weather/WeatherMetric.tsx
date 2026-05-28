import { Thermometer, Droplets, Wind, Eye, Sun, Gauge } from 'lucide-react';

const iconMap = { Thermometer, Droplets, Wind, Eye, Sun, Gauge } as const;
type MetricIcon = keyof typeof iconMap;

interface WeatherMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: MetricIcon;
}

export function WeatherMetric({ label, value, unit, icon }: WeatherMetricProps) {
  const Icon = iconMap[icon];

  return (
    <div className="bg-bg-soft border border-border-subtle rounded-2xl p-3 sm:p-4 flex flex-col gap-2 hover:border-border-muted hover:bg-accent-soft/40 transition-colors duration-200">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-accent-primary shrink-0" strokeWidth={1.75} />
        <span className="text-[9px] sm:text-[10px] font-semibold text-text-secondary uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-0.5 sm:gap-1">
        <span className="text-lg sm:text-xl font-semibold text-text-primary tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-[10px] sm:text-xs text-text-secondary font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}
