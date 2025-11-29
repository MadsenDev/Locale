import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiSearch } from 'react-icons/fi';
import type { CandidateString } from '../../types';
import { CandidateTable } from '../../components/CandidateTable';
import { CandidateFileView } from './CandidateFileView';

export type CandidateViewMode = 'list' | 'file';

const VIEW_OPTIONS: Array<{ id: CandidateViewMode; label: string }> = [
  { id: 'list', label: 'List' },
  { id: 'file', label: 'By file' },
];

type Props = {
  candidates: CandidateString[];
  viewMode: CandidateViewMode;
  onViewModeChange: (mode: CandidateViewMode) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onUpdateKey: (id: string, key: string) => void;
  onToggle: (id: string, include: boolean) => void;
  onMakeTranslateReady: (candidate: CandidateString) => void;
  languageKeys: Set<string>;
  showAll: boolean;
  onToggleShowAll: (value: boolean) => void;
  canApplyCodemod: boolean;
  className?: string;
};

export function CandidateViews({
  candidates,
  viewMode,
  onViewModeChange,
  filter,
  onFilterChange,
  onUpdateKey,
  onToggle,
  onMakeTranslateReady,
  languageKeys,
  showAll,
  onToggleShowAll,
  canApplyCodemod,
  className,
}: Props) {
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((item) =>
      [item.text, item.file, item.keySuggestion].filter(Boolean).join(' ').toLowerCase().includes(needle)
    );
  }, [candidates, filter]);

  const visibleCandidates = useMemo(() => {
    if (showAll) return filtered;
    return filtered.filter((item) => (item.keySuggestion ? !languageKeys.has(item.keySuggestion) : true));
  }, [filtered, languageKeys, showAll]);

  const hiddenCount = filtered.length - visibleCandidates.length;

  const containerClass = [
    'flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={containerClass}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <FiCheckCircle className="h-5 w-5 text-emerald-400" />
          <p className="text-sm">Review and tweak detected strings</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/70 px-2 py-1">
          {VIEW_OPTIONS.map((option) => {
            const active = viewMode === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onViewModeChange(option.id)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-semibold transition',
                  active
                    ? 'bg-slate-900 text-white shadow-inner shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white',
                ].join(' ')}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/70 px-2 py-1 text-xs text-slate-400">
          <span>{showAll ? 'Showing all strings' : 'New strings only'}</span>
          {hiddenCount > 0 && !showAll && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">{hiddenCount} hidden</span>
          )}
          <button
            type="button"
            onClick={() => onToggleShowAll(!showAll)}
            className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:border-emerald-500 hover:text-emerald-300"
          >
            {showAll ? 'Show new only' : 'Show all'}
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/70 px-3 py-2">
          <FiSearch className="h-4 w-4 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter by text or path"
            className="bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {viewMode === 'list' ? (
        <CandidateTable
          candidates={visibleCandidates}
          onUpdateKey={onUpdateKey}
          onToggle={onToggle}
          onMakeTranslateReady={onMakeTranslateReady}
          canApplyCodemod={canApplyCodemod}
          className="flex-1"
        />
      ) : (
        <CandidateFileView
          candidates={visibleCandidates}
          onUpdateKey={onUpdateKey}
          onToggle={onToggle}
          onMakeTranslateReady={onMakeTranslateReady}
          canApplyCodemod={canApplyCodemod}
        />
      )}
    </motion.section>
  );
}

