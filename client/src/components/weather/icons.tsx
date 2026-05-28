import type { WeatherIconName } from '../../types';

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const baseProps = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

function Sun({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.4" />
      <path d="M12 19.6V21" />
      <path d="M4.6 4.8l1 1" />
      <path d="M18.4 18.2l1 1" />
      <path d="M3 12h1.4" />
      <path d="M19.6 12H21" />
      <path d="M4.6 19.2l1-1" />
      <path d="M18.4 5.8l1-1" />
    </svg>
  );
}

function Cloud({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 18A4.2 4.2 0 0 1 6 9.7a5.4 5.4 0 0 1 10.4-.3 3.8 3.8 0 0 1 .9 7.5L17 18H6.5z" />
    </svg>
  );
}

function CloudRain({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 15A4 4 0 0 1 6 7a5.2 5.2 0 0 1 10.2-.3 3.7 3.7 0 0 1 .8 7.3" />
      <path d="M8.5 18.5l-.7 2" />
      <path d="M12 18l-.7 2.5" />
      <path d="M15.5 18.5l-.7 2" />
    </svg>
  );
}

function CloudDrizzle({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 15A4 4 0 0 1 6 7a5.2 5.2 0 0 1 10.2-.3 3.7 3.7 0 0 1 .8 7.3" />
      <circle cx="9" cy="19" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloudSnow({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 15A4 4 0 0 1 6 7a5.2 5.2 0 0 1 10.2-.3 3.7 3.7 0 0 1 .8 7.3" />
      <path d="M9 18.5l0 0.01" />
      <path d="M9 20.5l0 0.01" />
      <path d="M12 19.5l0 0.01" />
      <path d="M15 18.5l0 0.01" />
      <path d="M15 20.5l0 0.01" />
    </svg>
  );
}

function CloudLightning({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 15A4 4 0 0 1 6 7a5.2 5.2 0 0 1 10.2-.3 3.7 3.7 0 0 1 .8 7.3" />
      <path d="M12 14l-2 4h2.5l-1.5 3.5 3-4.2H11.7L13 14z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloudFog({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 14A4 4 0 0 1 6 6a5.2 5.2 0 0 1 10.2-.3 3.7 3.7 0 0 1 .8 7.3" />
      <path d="M5 17.5h13.5" />
      <path d="M4 20.5h11" />
    </svg>
  );
}

function Wind({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M4 8.5h11a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12.5h16" />
      <path d="M5 16.5h10a2.5 2.5 0 1 1-2.5 2.5" />
    </svg>
  );
}

function Tornado({ size = 18, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M4 5h16" />
      <path d="M5.5 8.5h12" />
      <path d="M7 12h9" />
      <path d="M9 15.5h5" />
      <path d="M10.5 19l1.5 2" />
    </svg>
  );
}

export const WeatherGlyph: Record<WeatherIconName, React.FC<IconProps>> = {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Tornado,
};

export function ThermometerGlyph({ size = 14, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M10 4.5a2 2 0 0 1 4 0v9.6a3.5 3.5 0 1 1-4 0V4.5z" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DropletGlyph({ size = 14, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 3.5c-3 4.5-5.5 7.5-5.5 10.5a5.5 5.5 0 0 0 11 0c0-3-2.5-6-5.5-10.5z" />
    </svg>
  );
}

export function GaugeGlyph({ size = 14, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="M12 16l4-4.5" />
    </svg>
  );
}

export function EyeGlyph({ size = 14, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M2.5 12c2-4 5.5-6.5 9.5-6.5s7.5 2.5 9.5 6.5c-2 4-5.5 6.5-9.5 6.5S4.5 16 2.5 12z" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

export function SunriseGlyph({ size = 16, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M3 18h18" />
      <path d="M7 14a5 5 0 0 1 10 0" />
      <path d="M12 3v3" />
      <path d="M5.5 8.5l1.5 1.5" />
      <path d="M17 10l1.5-1.5" />
    </svg>
  );
}

export function SunsetGlyph({ size = 16, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M3 18h18" />
      <path d="M7 14a5 5 0 0 1 10 0" />
      <path d="M12 9V6" />
      <path d="M5.5 8.5l1.5 1.5" />
      <path d="M17 10l1.5-1.5" />
    </svg>
  );
}

export function CompassGlyph({ size = 14, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l2.2 4.8L12 17l-2.2-5.2L12 7z" fill="currentColor" stroke="none" />
    </svg>
  );
}
