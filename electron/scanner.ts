import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import crypto from 'crypto';

export type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
};

export async function scanProject(
  rootPath: string,
  extensions: string[],
  ignore: string[]
): Promise<CandidateString[]> {
  const patterns = extensions.map((ext) => `**/*${ext}`);
  const files = await fg(patterns, {
    cwd: rootPath,
    ignore,
    absolute: true,
  });

  const results: CandidateString[] = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const relPath = path.relative(rootPath, filePath);

    const ast = parse(raw, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        ['decorators', { decoratorsBeforeExport: true }],
      ],
    });

    traverse(ast, {
      JSXText(pathNode) {
        const value = pathNode.node.value.trim();
        if (!value || /[\n\t]/.test(value)) return;

        const loc = pathNode.node.loc;
        const start = loc?.start ?? { line: 0, column: 0 };
        const context = raw.split('\n')[start.line - 1]?.trim() ?? '';
        const hash = crypto
          .createHash('md5')
          .update(`${value}-${relPath}-${start.line}-${start.column}`)
          .digest('hex');

        results.push({
          id: hash,
          text: value,
          file: relPath,
          line: start.line,
          column: start.column,
          context,
        });
      },
    });
  }

  return results;
}
