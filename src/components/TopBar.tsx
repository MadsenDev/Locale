import { FiSettings, FiFolder } from 'react-icons/fi';

export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3 text-slate-100">
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
          <FiFolder className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-semibold">LocaleForge</p>
          <p className="text-xs text-slate-400">Extract UI strings & craft translation keys</p>
        </div>
      </div>
      <button
        type="button"
        className="rounded-full border border-slate-800 bg-slate-800/50 p-2 text-slate-300 transition hover:border-slate-700 hover:text-white"
      >
        <FiSettings className="h-5 w-5" />
      </button>
    </header>
  );
}
