import { useMemo } from 'react';
import type { CandidateString } from '../../types';
import { Modal } from '../../components/common/Modal';

export type TranslationReadyConfig = {
  functionName: string;
  importSource: string;
  importKind: 'named' | 'default';
  skipImport: boolean;
};

type Props = {
  open: boolean;
  candidate: CandidateString | null;
  keyValue: string;
  config: TranslationReadyConfig;
  submitting: boolean;
  error?: string;
  onClose: () => void;
  onKeyChange: (value: string) => void;
  onConfigChange: (next: Partial<TranslationReadyConfig>) => void;
  onSubmit: () => void;
};

export function TranslationReadyModal({
  open,
  candidate,
  keyValue,
  config,
  submitting,
  error,
  onClose,
  onKeyChange,
  onConfigChange,
  onSubmit,
}: Props) {
  const previewSnippet = useMemo(() => {
    const fn = config.functionName.trim() || 't';
    const key = keyValue.trim() || 'translation.key';
    return `${fn}('${key}')`;
  }, [config.functionName, keyValue]);

  if (!open || !candidate) {
    return null;
  }

  const disableSubmit = submitting || !keyValue.trim() || !config.functionName.trim();

  return (
    <Modal title="Make translate-ready" onClose={onClose} className="w-full max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-sm uppercase tracking-widest text-slate-500">Source string</p>
          <p className="mt-1 text-lg font-semibold text-white">{candidate.text}</p>
          <p className="mt-2 text-xs text-slate-400">
            {candidate.file} · line {candidate.line}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Translation key</span>
            <input
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={keyValue}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder="dashboard.title"
              disabled={submitting}
            />
          </label>

          <label className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Function call</span>
            <input
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={config.functionName}
              onChange={(e) => onConfigChange({ functionName: e.target.value })}
              placeholder="t"
              disabled={submitting}
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Import</div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                checked={config.skipImport}
                onChange={(e) => onConfigChange({ skipImport: e.target.checked })}
                disabled={submitting}
              />
              Skip import (function is global)
            </label>
          </div>

          {!config.skipImport && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-wide text-slate-500">Module</span>
                <input
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  value={config.importSource}
                  onChange={(e) => onConfigChange({ importSource: e.target.value })}
                  placeholder="@/lib/i18n"
                  disabled={submitting}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-wide text-slate-500">Import kind</span>
                <select
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  value={config.importKind}
                  onChange={(e) => onConfigChange({ importKind: e.target.value as TranslationReadyConfig['importKind'] })}
                  disabled={submitting}
                >
                  <option value="named">Named import ({'{ t }'})</option>
                  <option value="default">Default import</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</div>
          <pre className="mt-2 rounded-lg bg-slate-950 px-3 py-2 text-sm text-emerald-300">{previewSnippet}</pre>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disableSubmit}
            className={[
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              disableSubmit
                ? 'cursor-not-allowed border border-slate-800 bg-slate-800/60 text-slate-500'
                : 'border border-emerald-500 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
            ].join(' ')}
          >
            {submitting ? 'Patching…' : 'Patch source file'}
          </button>
        </div>
      </div>
    </Modal>
  );
}


