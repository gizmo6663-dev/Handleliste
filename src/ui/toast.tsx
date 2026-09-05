import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

let counter = 0;
let messages: ToastMessage[] = [];
const listeners = new Set<(value: ToastMessage[]) => void>();

function publish(): void {
  for (const listener of listeners) listener(messages);
}

function dismiss(id: number): void {
  messages = messages.filter((message) => message.id !== id);
  publish();
}

/** Vis en kort melding, gjerne med en angreknapp. */
export function toast(text: string, action?: ToastMessage['action']): void {
  const id = ++counter;
  const message: ToastMessage = { id, text };
  if (action) message.action = action;
  // Bare én melding av gangen — appen skal være rolig, ikke masete.
  messages = [message];
  publish();
  setTimeout(() => dismiss(id), action ? 5200 : 2600);
}

export function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>(messages);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-area" role="status" aria-live="polite">
      {items.map((message) => (
        <div className="toast" key={message.id}>
          <span>{message.text}</span>
          {message.action && (
            <button
              type="button"
              onClick={() => {
                message.action?.run();
                dismiss(message.id);
              }}
            >
              {message.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
