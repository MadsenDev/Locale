import { motion } from 'framer-motion';
import { FiCheckCircle, FiEdit3, FiSearch } from 'react-icons/fi';
import type { CandidateString } from '../types';

interface Props {
  candidates: CandidateString[];
  onUpdateKey: (id: string, key: string) => void;
  onToggle: (id: string, include: boolean) => void;
  filter: string;
  onFilterChange: (value: string) => void;
}

export function CandidateTable({
  candidates,
  onUpdateKey,
  onToggle,
  filter,
  onFilterChange,
}: Props) {
  const filtered = candidates.filter((item) =>
    `${item.text} ${item.file} ${item.keySuggestion}`
      .toLowerCase()
      .includes(filter.toLowerCase())
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <FiCheckCircle className="h-5 w-5 text-emerald-400" />
          <p className="text-sm">Review and tweak detected strings</p>
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

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="grid grid-cols-12 bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
          <div className="col-span-4">Text</div>
          <div className="col-span-3">File</div>
          <div className="col-span-3">Suggested key</div>
          <div className="col-span-2 text-right">Include</div>
        </div>
        <div className="divide-y divide-slate-800">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 items-center gap-3 px-3 py-3 text-sm text-slate-100 hover:bg-slate-800/40"
            >
              <div className="col-span-4">
                <p className="font-medium text-white">{item.text}</p>
                <p className="text-xs text-slate-400">Line {item.line} · {item.context}</p>
              </div>
              <div className="col-span-3 text-xs text-slate-300">{item.file}</div>
              <div className="col-span-3">
                <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs text-slate-200">
                  <FiEdit3 className="h-4 w-4 text-slate-400" />
                  <input
                    value={item.keySuggestion ?? ''}
                    onChange={(e) => onUpdateKey(item.id, e.target.value)}
                    className="w-full bg-transparent text-xs text-white outline-none"
                  />
                </label>
              </div>
              <div className="col-span-2 text-right">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  checked={item.include ?? true}
                  onChange={(e) => onToggle(item.id, e.target.checked)}
                />
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-slate-500">No matches yet. Run a scan to see candidates.</div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
