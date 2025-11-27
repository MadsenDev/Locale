export const ROOT_NODE_KEY = '__root__';

export const FOLDER_RECOMMENDATIONS = ['src', 'app', 'apps', 'packages', 'services', 'libs'];

export type DirectoryNode = {
  name: string;
  path: string;
  hasChildren: boolean;
};

