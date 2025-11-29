import { useMemo } from 'react';
import { FiEdit3, FiZap } from 'react-icons/fi';
import type { CandidateString } from '../../types';

type Props = {
  candidates: CandidateString[];
  onUpdateKey: (id: string, key: string) => void;
  onToggle: (id: string, include: boolean) => void;
  onMakeTranslateReady: (candidate: CandidateString) => void;
  canApplyCodemod: boolean;
};

export function CandidateFileView({ candidates, onUpdateKey, onToggle, onMakeTranslateReady, canApplyCodemod }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, CandidateString[]>();
    candidates.forEach((candidate) => {
      const list = map.get(candidate.file);
      if (list) {
        list.push(candidate);
      } else {
        map.set(candidate.file, [candidate]);
      }
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [candidates]);

  if (candidates.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center text-sm text-slate-500">
        No matches yet. Run a scan to see candidates.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex-1 min-h-0 overflow-auto pr-1">
        {groups.map(([file, items]) => (
          <div key={file} className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
              <div className="text-sm font-semibold text-white">{file}</div>
              <div className="text-xs text-slate-400">{items.length} string{items.length === 1 ? '' : 's'}</div>
            </div>
            <div className="divide-y divide-slate-800">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800/40"
                >
                  <div className="col-span-5">
                    <p className="font-medium text-white">{item.text}</p>
                    <p className="text-xs text-slate-500">
                      Line {item.line} · {item.context}
                    </p>
                  </div>
                  <div className="col-span-4">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs text-slate-200">
                      <FiEdit3 className="h-4 w-4 text-slate-400" />
                      <input
                        value={item.keySuggestion ?? ''}
                        onChange={(e) => onUpdateKey(item.id, e.target.value)}
                        className="w-full bg-transparent text-xs text-white outline-none"
                      />
                    </label>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onMakeTranslateReady(item)}
                      disabled={item.localized || !item.keySuggestion || !canApplyCodemod}
                      className={[
                        'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition',
                        item.localized
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : canApplyCodemod && item.keySuggestion
                            ? 'border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10'
                            : 'cursor-not-allowed border-slate-800 bg-slate-800/60 text-slate-500',
                      ].join(' ')}
                    >
                      <FiZap className="h-3.5 w-3.5" />
                      {item.localized ? 'Patched' : 'Localize'}
                    </button>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                      checked={item.include ?? true}
                      onChange={(e) => onToggle(item.id, e.target.checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

