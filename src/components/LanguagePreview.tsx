import { motion } from 'framer-motion';
import { FiFileText, FiExternalLink } from 'react-icons/fi';

interface Props {
  path: string;
  jsonPreview: string;
  onReveal: () => void;
}

export function LanguagePreview({ path, jsonPreview, onReveal }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <FiFileText className="h-5 w-5 text-blue-300" />
          <div>
            <p className="text-sm font-semibold">Base language</p>
            <p className="text-xs text-slate-400">{path || 'No file selected yet'}</p>
          </div>
        </div>
        {path && (
          <button
            onClick={onReveal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-1 text-xs font-semibold text-white transition hover:border-slate-700"
          >
            <FiExternalLink className="h-4 w-4" />
            Reveal in Finder
          </button>
        )}
      </div>
      <pre className="max-h-48 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-emerald-100">
        {jsonPreview || '// Preview will appear after loading'}
      </pre>
    </motion.section>
  );
}
