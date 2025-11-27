import { Modal } from '../../components/common/Modal';

type TranslationProgressEvent = {
  locale: string;
  status: 'pending' | 'updated' | 'skipped' | 'error';
  translated?: number;
  total?: number;
  message?: string;
  error?: string;
  timestamp: number;
};

interface TranslationProgressModalProps {
  open: boolean;
  onClose: () => void;
  order: string[];
  logs: Record<string, TranslationProgressEvent>;
}

export function TranslationProgressModal({ open, onClose, order, logs }: TranslationProgressModalProps) {
  if (!open) return null;

  return (
    <Modal title="Translating locales" onClose={onClose} className="max-w-2xl">
      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {order.length === 0 ? (
          <p className="text-sm text-slate-400">Waiting for updates…</p>
        ) : (
          order.map((locale) => {
            const log = logs[locale];
            if (!log) return null;
            const progress =
              log.total && log.total > 0
                ? Math.min(100, Math.round(((log.translated ?? 0) / log.total) * 100))
                : log.status === 'updated'
                  ? 100
                  : 0;

            return (
              <div
                key={`${locale}-${log.timestamp}`}
                className="rounded-xl border border-slate-900/60 bg-slate-900/40 px-3 py-2 text-sm text-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{locale}</span>
                  <span
                    className={
                      log.status === 'error'
                        ? 'text-rose-300'
                        : log.status === 'updated'
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                    }
                  >
                    {log.status === 'pending' && 'In progress'}
                    {log.status === 'updated' && 'Updated'}
                    {log.status === 'skipped' && 'Up to date'}
                    {log.status === 'error' && 'Error'}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      log.status === 'error'
                        ? 'bg-rose-500'
                        : log.status === 'updated'
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {log.status === 'error'
                    ? log.error ?? log.message ?? 'Translation failed'
                    : log.status === 'skipped'
                      ? 'Already up to date'
                      : `${progress}% (${log.translated ?? 0}/${log.total ?? 0} keys)`}
                </p>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

