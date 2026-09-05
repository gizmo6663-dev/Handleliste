/** Strøkne linjeikoner. Alle arver farge fra teksten rundt seg. */

interface IconProps {
  size?: number;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function IconList({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function IconSpark({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.2l1.9 4.6 4.6 1.9-4.6 1.9L12 16.2l-1.9-4.6L5.5 9.7l4.6-1.9L12 3.2z" />
      <path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" />
    </svg>
  );
}

export function IconChart({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V6M17 20v-9" />
    </svg>
  );
}

export function IconGear({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.6a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
    </svg>
  );
}

export function IconPlus({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconCheck({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12.6l4.6 4.6L19 7.4" />
    </svg>
  );
}

export function IconTrash({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M9.5 7V5.4A1.4 1.4 0 0110.9 4h2.2a1.4 1.4 0 011.4 1.4V7" />
      <path d="M6.5 7l.8 12.1A1.5 1.5 0 008.8 20.5h6.4a1.5 1.5 0 001.5-1.4L17.5 7" />
    </svg>
  );
}

export function IconStar({ size = 20, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.5-4.6 2.5.9-5.3L4.5 9.6l5.2-.7L12 4z" />
    </svg>
  );
}

export function IconClock({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}

export function IconBag({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5.4 8h13.2l-1 11.1a1.6 1.6 0 01-1.6 1.4H8a1.6 1.6 0 01-1.6-1.4L5.4 8z" />
      <path d="M9 8V6.6a3 3 0 016 0V8" />
    </svg>
  );
}

export function IconUndo({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 9h9.5a5 5 0 010 10H8" />
      <path d="M7.5 5.5L4 9l3.5 3.5" />
    </svg>
  );
}

export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconChevron({ size = 18, dir = 'right' }: IconProps & { dir?: 'right' | 'up' | 'down' }) {
  const rotate = dir === 'up' ? -90 : dir === 'down' ? 90 : 0;
  return (
    <svg {...base(size)} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M9.5 5.5L16 12l-6.5 6.5" />
    </svg>
  );
}
