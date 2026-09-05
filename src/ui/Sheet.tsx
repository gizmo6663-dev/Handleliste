import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bunn-ark for detaljer. Lukkes med Escape, klikk utenfor eller sveip ned. */
export function Sheet({ title, subtitle, onClose, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="sheet"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onTouchStart={(event) => {
          dragStart.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const start = dragStart.current;
          const end = event.changedTouches[0]?.clientY;
          if (start !== null && end !== undefined && end - start > 90) onClose();
          dragStart.current = null;
        }}
      >
        <div className="sheet-grip" />
        <h2>{title}</h2>
        {subtitle && <p className="sheet-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
