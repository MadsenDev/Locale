import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import crypto from 'crypto';

const LOCALIZED_FUNCTIONS = new Set(['t', 'translate', 'formatMessage', 'intl.formatMessage']);

export type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
  localized?: boolean;
  keyPath?: string;
};

export async function scanProject(
  rootPath: string,
  extensions: string[],
  ignore: string[],
  includeDirectories?: string[]
): Promise<CandidateString[]> {
  const patterns =
    includeDirectories && includeDirectories.length > 0
      ? extensions.flatMap((ext) =>
          includeDirectories.map((dir) => {
            const normalized = dir.replace(/\\/g, '/');
            if (!normalized || normalized === '.') {
              return `**/*${ext}`;
            }
            return path.posix.join(normalized, '**', `*${ext}`);
          })
        )
      : extensions.map((ext) => `**/*${ext}`);
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
        recordCandidate(value, relPath, pathNode.node.loc, raw, false);
      },
      CallExpression(pathNode) {
        const localized = extractLocalizedCall(pathNode);
        if (localized) {
          recordCandidate(localized.key, relPath, pathNode.node.loc, raw, true, localized.key);
        }
      },
    });
  }

  return results;

  function recordCandidate(
    text: string,
    file: string,
    loc: { start: { line: number; column: number } } | null | undefined,
    source: string,
    localized: boolean,
    keyPath?: string
  ) {
    const value = text.trim();
    if (!value) return;

    const start = loc?.start ?? { line: 0, column: 0 };
    const context = source.split('\n')[start.line - 1]?.trim() ?? '';
    const hash = crypto
      .createHash('md5')
      .update(`${value}-${file}-${start.line}-${start.column}-${localized ? 'localized' : 'plain'}`)
      .digest('hex');

    results.push({
      id: hash,
      text: value,
      file,
      line: start.line,
      column: start.column,
      context,
      localized,
      keyPath,
    });
  }
}

function extractLocalizedCall(pathNode: any): { key: string } | null {
  const callee = pathNode.node.callee;
  let name = '';

  if (callee.type === 'Identifier') {
    name = callee.name;
  } else if (callee.type === 'MemberExpression') {
    const objectName =
      callee.object.type === 'Identifier'
        ? callee.object.name
        : callee.object.type === 'MemberExpression' && callee.object.property.type === 'Identifier'
          ? `${callee.object.object.type === 'Identifier' ? callee.object.object.name : ''}.${callee.object.property.name}`
          : '';
    const propertyName = callee.property.type === 'Identifier' ? callee.property.name : '';
    name = [objectName, propertyName].filter(Boolean).join('.');
  }

  if (!name || !LOCALIZED_FUNCTIONS.has(name)) {
    return null;
  }

  const firstArg = pathNode.node.arguments[0];
  if (!firstArg) return null;

  if (firstArg.type === 'StringLiteral') {
    return { key: firstArg.value };
  }

  if (firstArg.type === 'ObjectExpression') {
    const idProp = firstArg.properties.find(
      (prop: any) =>
        prop.type === 'ObjectProperty' &&
        prop.key.type === 'Identifier' &&
        prop.key.name === 'id' &&
        prop.value.type === 'StringLiteral'
    );
    if (idProp) {
      return { key: idProp.value.value };
    }
  }

  if (firstArg.type === 'TemplateLiteral' && firstArg.quasis.length === 1 && firstArg.expressions.length === 0) {
    return { key: firstArg.quasis[0].value.cooked ?? firstArg.quasis[0].value.raw };
  }

  return null;
}
