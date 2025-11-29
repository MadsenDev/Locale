import { FiEdit3, FiZap } from 'react-icons/fi';
import type { CandidateString } from '../types';

interface Props {
  candidates: CandidateString[];
  onUpdateKey: (id: string, key: string) => void;
  onToggle: (id: string, include: boolean) => void;
  onMakeTranslateReady: (candidate: CandidateString) => void;
  canApplyCodemod: boolean;
  className?: string;
}

export function CandidateTable({
  candidates,
  onUpdateKey,
  onToggle,
  onMakeTranslateReady,
  canApplyCodemod,
  className
}: Props) {
  const sectionClass = [
  'flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner',
  className].

  filter(Boolean).
  join(' ');

  return (
    <section className={sectionClass}>
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-800">
        <div className="grid grid-cols-12 bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
          <div className="col-span-4">Text</div>
          <div className="col-span-3">File</div>
          <div className="col-span-3">Suggested key</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-800 overflow-auto max-h-full pr-1 pb-20">
          {candidates.map((item) =>
          <div
            key={item.id}
            className="grid grid-cols-12 items-center gap-3 px-3 py-3 text-sm text-slate-100 hover:bg-slate-800/40">

              <div className="col-span-4">
                <p className="font-medium text-white">{item.text}</p>
                <p className="text-xs text-slate-400">
                  Line {item.line} · {item.context}
                </p>
              </div>
              <div className="col-span-3 text-xs text-slate-300">{item.file}</div>
              <div className="col-span-3">
                <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs text-slate-200">
                  <FiEdit3 className="h-4 w-4 text-slate-400" />
                  <input
                  value={item.keySuggestion ?? ''}
                  onChange={(e) => onUpdateKey(item.id, e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none" />

                </label>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <button
                type="button"
                onClick={() => onMakeTranslateReady(item)}
                disabled={item.localized || !item.keySuggestion || !canApplyCodemod}
                className={[
                'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition',
                item.localized ?
                'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' :
                canApplyCodemod && item.keySuggestion ?
                'border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10' :
                'cursor-not-allowed border-slate-800 bg-slate-800/60 text-slate-500'].
                join(' ')}>

                  {item.localized ?
                <>
                      <FiZap className="h-3.5 w-3.5" />
                      Patched
                    </> :

                <>
                      <FiZap className="h-3.5 w-3.5" />
                      Localize
                </>
                }
                </button>
                <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                checked={item.include ?? true}
                onChange={(e) => onToggle(item.id, e.target.checked)} />

              </div>
            </div>
          )}

          {candidates.length === 0 &&
          <div className="px-3 py-6 text-center text-slate-500">No matches yet. Run a scan to see candidates.</div>
          }
        </div>
      </div>
    </section>);

}