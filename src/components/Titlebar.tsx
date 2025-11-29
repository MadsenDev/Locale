import { FiMinus, FiSquare, FiX } from 'react-icons/fi';

type TitlebarProps = {
  title?: string;
};

export function Titlebar({ title = 'LocaleForge' }: TitlebarProps) {
  const controls = window.api?.window;

  const handleMinimize = () => controls?.minimize?.();
  const handleMaximize = () => controls?.maximize?.();
  const handleClose = () => controls?.close?.();

  return (
    <div className="drag flex items-center justify-between border-b border-slate-800/60 bg-gradient-to-r from-slate-950 to-slate-900 px-4 py-2 text-slate-200 shadow-lg">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleMinimize}
          className="no-drag rounded-lg border border-slate-700/80 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800/80"
        >
          <FiMinus className="h-3 w-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="no-drag rounded-lg border border-slate-700/80 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800/80"
        >
          <FiSquare className="h-3 w-3" />
        </button>
        <button
          onClick={handleClose}
          className="no-drag rounded-lg border border-rose-500/60 bg-rose-600/80 p-2 text-slate-50 transition hover:bg-rose-500"
        >
          <FiX className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

