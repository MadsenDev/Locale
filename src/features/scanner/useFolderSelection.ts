import { useCallback, useEffect, useRef, useState } from 'react';
import { DirectoryNode, FOLDER_RECOMMENDATIONS, ROOT_NODE_KEY } from './constants';

const ipc = window.api;

type FolderTreeMap = Record<string, DirectoryNode[]>;

export function useFolderSelection(projectPath: string) {
  const [modalOpen, setModalOpen] = useState(false);
  const [treeData, setTreeData] = useState<FolderTreeMap>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set([ROOT_NODE_KEY]));
  const [selection, setSelection] = useState<string[]>([]);
  const [includedDirs, setIncludedDirs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const listFolders = ipc.listProjectFolders;

  const loadChildren = useCallback(
    async (relativePath: string | null, customRoot?: string, force = false) => {
      const root = customRoot ?? projectPath;
      if (!root || !listFolders) return [];
      const key = relativePath ?? ROOT_NODE_KEY;
      if (!force && treeData[key]) {
        return treeData[key];
      }

      setLoading(true);
      setError('');
      try {
        const response = await listFolders({
          root,
          path: relativePath ?? undefined,
        });
        const children = (response?.children ?? []).sort((a, b) => a.name.localeCompare(b.name));
        setTreeData((prev) => ({ ...prev, [key]: children }));

        if (key === ROOT_NODE_KEY && selectionRef.current.length === 0 && children.length > 0) {
          const recommended = children
            .filter((child) => FOLDER_RECOMMENDATIONS.includes(child.name))
            .map((child) => child.path);
          if (recommended.length > 0) {
            setSelection(recommended);
          }
        }

        return children;
      } catch (err) {
        console.error(err);
        setError('Unable to load directories. Please try again.');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [listFolders, projectPath, treeData]
  );

  useEffect(() => {
    setTreeData({});
    setSelection([]);
    setIncludedDirs([]);
    setExpanded(new Set([ROOT_NODE_KEY]));
    if (projectPath) {
      loadChildren(null, projectPath, true);
    }
  }, [projectPath, loadChildren]);

  const openModal = useCallback(
    async (rootOverride?: string) => {
      const activeRoot = rootOverride ?? projectPath;
      if (!activeRoot) return;
      if (!treeData[ROOT_NODE_KEY] || rootOverride) {
        await loadChildren(null, activeRoot, true);
      }
      setModalOpen(true);
    },
    [projectPath, treeData, loadChildren]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const toggleNode = useCallback(
    async (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
      if (!treeData[path]) {
        await loadChildren(path);
      }
    },
    [loadChildren, treeData]
  );

  const selectNode = useCallback((path: string, checked: boolean) => {
    setSelection((prev) => {
      if (checked) {
        return prev.includes(path) ? prev : [...prev, path];
      }
      return prev.filter((entry) => entry !== path);
    });
  }, []);

  const selectRecommended = useCallback(() => {
    const rootChildren = treeData[ROOT_NODE_KEY] ?? [];
    const recommended = rootChildren
      .filter((child) => FOLDER_RECOMMENDATIONS.includes(child.name))
      .map((child) => child.path);
    setSelection(recommended);
  }, [treeData]);

  const selectNone = useCallback(() => {
    setSelection([]);
  }, []);

  const selectAllLoaded = useCallback(() => {
    const all = Object.values(treeData)
      .flat()
      .map((node) => node.path);
    setSelection(all);
  }, [treeData]);

  const applySelection = useCallback(() => {
    setIncludedDirs(selection);
    setModalOpen(false);
  }, [selection]);

  return {
    modalOpen,
    openModal,
    closeModal,
    applySelection,
    selection,
    selectNode,
    selectRecommended,
    selectNone,
    selectAllLoaded,
    expanded,
    toggleNode,
    treeData,
    includedDirs,
    loading,
    error,
  };
}

