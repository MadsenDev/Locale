import { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ title, onClose, children, className }: ModalProps) {
  const containerClasses = [
    'w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl',
    className ?? 'max-w-lg',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <div className={containerClasses}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-transparent p-1 text-slate-400 transition hover:border-slate-700 hover:text-white"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

