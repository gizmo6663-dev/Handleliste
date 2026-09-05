import { useEffect, useState, type ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={scrolled ? 'top scrolled' : 'top'}>
      <div className="top-inner">
        <h1 className="top-title">
          {title}
          {subtitle && <span className="top-sub">{subtitle}</span>}
        </h1>
        {children}
      </div>
    </header>
  );
}

interface ProgressRingProps {
  done: number;
  total: number;
}

/** Liten ring som viser hvor langt du er kommet i handleturen. */
export function ProgressRing({ done, total }: ProgressRingProps) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? done / total : 0;

  return (
    <div
      className="progress"
      role="img"
      aria-label={`${done} av ${total} varer krysset av`}
      title={`${done} av ${total}`}
    >
      <svg viewBox="0 0 38 38">
        <circle className="track" cx="19" cy="19" r={radius} />
        <circle
          className="value"
          cx="19"
          cy="19"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span>{total - done}</span>
    </div>
  );
}
