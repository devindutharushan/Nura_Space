import type { WeatherIconName } from '../../types';

interface SkySceneProps {
  condition: WeatherIconName;
  isNight?: boolean;
  className?: string;
}

const palettes: Record<WeatherIconName, { from: string; to: string; tint: string }> = {
  Sun: { from: '#FFF6E2', to: '#FBE0B0', tint: '#E0902B' },
  Cloud: { from: '#EEF3F0', to: '#D7E0DA', tint: '#6E7F77' },
  CloudRain: { from: '#E4EDF3', to: '#C2D3E0', tint: '#3E6E94' },
  CloudDrizzle: { from: '#E6EFF1', to: '#C7DDE0', tint: '#4F8A92' },
  CloudSnow: { from: '#EEF5F8', to: '#CDDFE6', tint: '#5C8FA6' },
  CloudLightning: { from: '#EBE7F2', to: '#CFC6DF', tint: '#5C49A0' },
  CloudFog: { from: '#EFEEEB', to: '#D5D3CD', tint: '#6F6F62' },
  Wind: { from: '#E7EEF2', to: '#C7D5DE', tint: '#3F6E88' },
  Tornado: { from: '#E5E7EA', to: '#C0C5C9', tint: '#4A535B' },
};

function NightSky() {
  return (
    <g opacity="0.45">
      <circle cx="60" cy="50" r="1" fill="#2D3B53" />
      <circle cx="120" cy="40" r="0.8" fill="#2D3B53" />
      <circle cx="200" cy="70" r="1.2" fill="#2D3B53" />
      <circle cx="280" cy="55" r="0.9" fill="#2D3B53" />
      <circle cx="340" cy="35" r="1.1" fill="#2D3B53" />
      <circle cx="90" cy="90" r="0.7" fill="#2D3B53" />
      <circle cx="240" cy="100" r="0.8" fill="#2D3B53" />
      <circle cx="380" cy="85" r="1" fill="#2D3B53" />
    </g>
  );
}

function SunScene({ tint }: { tint: string }) {
  return (
    <g>
      <circle cx="320" cy="80" r="42" fill={tint} opacity="0.18" />
      <circle cx="320" cy="80" r="28" fill={tint} opacity="0.55" className="animate-sun-pulse" />
      <circle cx="320" cy="80" r="18" fill={tint} opacity="0.9" />
      <g opacity="0.4" stroke={tint} strokeWidth="1.2" strokeLinecap="round">
        <path d="M320 26 L320 38" />
        <path d="M374 80 L362 80" />
        <path d="M280 38 L290 48" />
        <path d="M360 38 L350 48" />
      </g>
    </g>
  );
}

function CloudScene({ tint, density = 1 }: { tint: string; density?: number }) {
  return (
    <g>
      <g opacity={0.25 * density}>
        <ellipse cx="80" cy="110" rx="70" ry="22" fill={tint} />
      </g>
      <g opacity={0.45 * density} className="animate-drift-slow">
        <path
          d="M40 80 Q40 60 65 60 Q75 45 95 50 Q115 40 130 55 Q150 50 155 70 Q175 70 175 90 Q175 110 150 110 L60 110 Q40 110 40 90 Z"
          fill={tint}
        />
      </g>
      <g opacity={0.6 * density}>
        <path
          d="M210 90 Q210 72 232 72 Q240 60 258 65 Q276 58 290 70 Q308 68 312 86 Q330 88 330 104 Q330 120 310 120 L230 120 Q210 120 210 104 Z"
          fill={tint}
        />
      </g>
    </g>
  );
}

function RainScene({ tint }: { tint: string }) {
  return (
    <g>
      <CloudScene tint={tint} density={1.1} />
      <g stroke={tint} strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
        <path d="M70 135 L62 152" />
        <path d="M95 140 L88 160" />
        <path d="M125 138 L118 156" />
        <path d="M155 142 L148 162" />
        <path d="M235 138 L228 156" />
        <path d="M265 142 L258 162" />
        <path d="M295 138 L288 156" />
      </g>
    </g>
  );
}

function DrizzleScene({ tint }: { tint: string }) {
  return (
    <g>
      <CloudScene tint={tint} density={0.95} />
      <g fill={tint} opacity="0.7">
        <circle cx="75" cy="142" r="1" />
        <circle cx="105" cy="148" r="1" />
        <circle cx="140" cy="145" r="1" />
        <circle cx="170" cy="150" r="1" />
        <circle cx="245" cy="145" r="1" />
        <circle cx="280" cy="150" r="1" />
        <circle cx="310" cy="143" r="1" />
      </g>
    </g>
  );
}

function SnowScene({ tint }: { tint: string }) {
  return (
    <g>
      <CloudScene tint={tint} density={1.05} />
      <g fill={tint} opacity="0.85">
        <circle cx="70" cy="140" r="1.4" />
        <circle cx="105" cy="155" r="1.2" />
        <circle cx="140" cy="145" r="1.4" />
        <circle cx="175" cy="160" r="1.2" />
        <circle cx="240" cy="148" r="1.4" />
        <circle cx="275" cy="158" r="1.2" />
        <circle cx="310" cy="145" r="1.4" />
      </g>
    </g>
  );
}

function LightningScene({ tint }: { tint: string }) {
  return (
    <g>
      <CloudScene tint={tint} density={1.2} />
      <path
        d="M130 130 L120 152 L132 152 L122 175 L148 145 L134 145 L142 130 Z"
        fill={tint}
        opacity="0.95"
      />
    </g>
  );
}

function FogScene({ tint }: { tint: string }) {
  return (
    <g opacity="0.6">
      <path
        d="M20 90 Q120 70 220 90 T380 90"
        stroke={tint}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M10 115 Q110 100 220 115 T390 115"
        stroke={tint}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M30 145 Q130 130 240 145 T390 145"
        stroke={tint}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
    </g>
  );
}

function WindScene({ tint }: { tint: string }) {
  return (
    <g stroke={tint} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7">
      <path d="M30 70 Q130 60 220 75 Q280 80 320 70" />
      <path d="M40 100 Q150 90 250 105 Q300 110 340 105" />
      <path d="M30 130 Q140 120 230 135 Q290 140 330 130" />
      <path d="M40 160 Q140 150 230 162" />
    </g>
  );
}

function TornadoScene({ tint }: { tint: string }) {
  return (
    <g stroke={tint} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.8">
      <path d="M260 60 Q330 65 360 60" />
      <path d="M250 80 Q320 90 350 80" />
      <path d="M255 100 Q310 115 335 105" />
      <path d="M270 120 Q300 135 320 125" />
      <path d="M285 145 Q300 158 305 145" />
    </g>
  );
}

function sceneFor(condition: WeatherIconName, tint: string) {
  switch (condition) {
    case 'Sun':
      return <SunScene tint={tint} />;
    case 'Cloud':
      return <CloudScene tint={tint} />;
    case 'CloudRain':
      return <RainScene tint={tint} />;
    case 'CloudDrizzle':
      return <DrizzleScene tint={tint} />;
    case 'CloudSnow':
      return <SnowScene tint={tint} />;
    case 'CloudLightning':
      return <LightningScene tint={tint} />;
    case 'CloudFog':
      return <FogScene tint={tint} />;
    case 'Wind':
      return <WindScene tint={tint} />;
    case 'Tornado':
      return <TornadoScene tint={tint} />;
  }
}

export function SkyScene({ condition, isNight, className }: SkySceneProps) {
  const palette = palettes[condition] ?? palettes.Cloud;
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${condition}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#sky-${condition})`} />
      {isNight && <NightSky />}
      {sceneFor(condition, palette.tint)}
    </svg>
  );
}
