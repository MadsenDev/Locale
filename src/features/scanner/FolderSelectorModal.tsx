import { DirectoryNode, ROOT_NODE_KEY } from './constants';
import { Modal } from '../../components/common/Modal';

type FolderSelectorModalProps = {
  open: boolean;
  loading: boolean;
  error: string;
  rootNodes: DirectoryNode[];
  treeData: Record<string, DirectoryNode[]>;
  expanded: Set<string>;
  selection: string[];
  onClose: () => void;
  onApply: () => void;
  onToggle: (path: string) => void;
  onSelect: (path: string, checked: boolean) => void;
  onSelectRecommended: () => void;
  onSelectNone: () => void;
  onSelectAllLoaded: () => void;
};

export function FolderSelectorModal({
  open,
  loading,
  error,
  rootNodes,
  treeData,
  expanded,
  selection,
  onClose,
  onApply,
  onToggle,
  onSelect,
  onSelectRecommended,
  onSelectNone,
  onSelectAllLoaded,
}: FolderSelectorModalProps) {
  if (!open) return null;

  const selectedCount = selection.length;

  return (
    <Modal title="Select folders to scan" onClose={onClose} className="max-w-3xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Scanning fewer folders keeps things fast. Expand the tree and only include directories that contain source files
          you care about. Skip heavy folders like{' '}
          <code className="rounded bg-slate-800/60 px-1 py-0.5 text-xs text-slate-100">node_modules</code>,{' '}
          <code className="rounded bg-slate-800/60 px-1 py-0.5 text-xs text-slate-100">dist</code>, etc.
        </p>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectRecommended}
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-slate-700"
          >
            Select recommended
          </button>
          <button
            type="button"
            onClick={onSelectNone}
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-700"
          >
            Select none
          </button>
          <button
            type="button"
            onClick={onSelectAllLoaded}
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-700"
          >
            Select all loaded
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-900/70 bg-slate-950/40 p-3">
          {loading && <p className="text-sm text-slate-400">Loading folders…</p>}
          {!loading && rootNodes.length === 0 && (
            <p className="text-sm text-slate-400">
              No subdirectories found (they may all be ignored). Select “Apply” to scan the whole project or choose a different
              root.
            </p>
          )}
          {!loading && rootNodes.length > 0 && (
            <FolderTree
              nodes={rootNodes}
              expanded={expanded}
              selected={new Set(selection)}
              onToggle={onToggle}
              onSelect={onSelect}
              treeData={treeData}
            />
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {selectedCount === 0 ? 'All project folders will be scanned.' : `${selectedCount} folder${selectedCount === 1 ? '' : 's'} selected.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Apply selection
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

type FolderTreeProps = {
  nodes: DirectoryNode[];
  expanded: Set<string>;
  selected: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string, checked: boolean) => void;
  treeData: Record<string, DirectoryNode[]>;
  level?: number;
};

function FolderTree({ nodes, expanded, selected, onToggle, onSelect, treeData, level = 0 }: FolderTreeProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <ul className={`space-y-1 ${level > 0 ? 'mt-1 border-l border-slate-900/40 pl-4' : ''}`}>
      {nodes.map((node) => {
        const nodeKey = node.path || node.name;
        const isExpanded = expanded.has(node.path);
        const isChecked = selected.has(node.path);
        const childNodes = treeData[node.path] ?? [];

        return (
          <li key={nodeKey} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-white">
              {node.hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.path)}
                  className="rounded p-1 text-slate-300 hover:bg-slate-800/40"
                  aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
              ) : (
                <span className="inline-block w-4" />
              )}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(event) => onSelect(node.path, event.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-slate-100">{node.name || ROOT_NODE_KEY}</span>
            </div>
            {isExpanded && node.hasChildren && childNodes.length > 0 && (
              <FolderTree
                nodes={childNodes}
                expanded={expanded}
                selected={selected}
                onToggle={onToggle}
                onSelect={onSelect}
                treeData={treeData}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

