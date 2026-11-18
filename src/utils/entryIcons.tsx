import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { EntryIconId } from '../types/tracker';

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.2 4 6.2 13.4h5.2l-.8 6.6 7.2-9.4h-5.2L13.2 4Z" />
    </svg>
  );
}

function StairsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 6h6v6h5v6h5" />
    </svg>
  );
}

export function NoteBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.8L4 17.6V14a2 2 0 0 1-2-2V4Z" />
    </svg>
  );
}

export function AlternativeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.4 7.9A6 6 0 0 1 14.9 6.6"
        stroke="currentColor"
        strokeWidth={2.3}
        strokeLinecap="round"
      />
      <path d="M12.8 8.1 17.1 5.1 16 9.8Z" fill="currentColor" />
      <path
        d="M15.6 12.1A6 6 0 0 1 5.1 13.4"
        stroke="currentColor"
        strokeWidth={2.3}
        strokeLinecap="round"
      />
      <path d="M7.2 11.9 2.9 14.9 4 10.2Z" fill="currentColor" />
    </svg>
  );
}

export interface EntryIconOption {
  id: EntryIconId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

export const ENTRY_ICON_OPTIONS: EntryIconOption[] = [
  {
    id: 'failure',
    label: 'Fallo máximo',
    Icon: BoltIcon,
    colorClass: 'text-violet-600',
  },
  {
    id: 'step_regression',
    label: 'Fallo escalonado',
    Icon: StairsIcon,
    colorClass: 'text-yellow-500',
  },
  {
    id: 'next_up',
    label: 'Subir peso próxima',
    Icon: ArrowUp,
    colorClass: 'text-emerald-600',
  },
  {
    id: 'next_down',
    label: 'Bajar peso próxima',
    Icon: ArrowDown,
    colorClass: 'text-red-600',
  },
];

export const ENTRY_ICON_MAP = new Map<EntryIconId, EntryIconOption>(
  ENTRY_ICON_OPTIONS.map((opt) => [opt.id, opt])
);
