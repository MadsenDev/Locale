import { motion } from 'framer-motion';
import { FiCheck, FiAlertTriangle, FiFilePlus } from 'react-icons/fi';

interface Props {
  total: number;
  selected: number;
  existing: number;
}

const cards = [
  { key: 'total', label: 'Detected', icon: FiFilePlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'selected', label: 'Chosen', icon: FiCheck, color: 'text-blue-300', bg: 'bg-blue-500/10' },
  { key: 'existing', label: 'Existing keys', icon: FiAlertTriangle, color: 'text-amber-300', bg: 'bg-amber-500/10' },
] as const;

export function SummaryCards({ total, selected, existing }: Props) {
  const values: Record<string, number> = { total, selected, existing };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map(({ key, label, icon: Icon, color, bg }) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{label}</p>
              <p className="text-2xl font-semibold text-white">{values[key]}</p>
            </div>
            <div className={`rounded-xl ${bg} p-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
