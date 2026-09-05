import { useEffect, useRef, type ReactNode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

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

  // På Android lukker tilbakeknappen arket. Så lenge en lytter er registrert,
  // lar plattformen være å navigere selv.
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let cancelled = false;
    CapacitorApp.addListener('backButton', () => onClose())
      .then((registered) => {
        if (cancelled) registered.remove();
        else handle = registered;
      })
      .catch(() => {
        // Ikke på en enhet med tilbakeknapp — da gjelder Escape og klikk utenfor.
      });
    return () => {
      cancelled = true;
      handle?.remove();
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
