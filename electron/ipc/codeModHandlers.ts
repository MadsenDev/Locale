import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

type WrapTranslationPayload = {
  projectPath: string;
  relativePath: string;
  text: string;
  line: number;
  column: number;
  key: string;
  functionName: string;
  importSource?: string;
  importKind?: 'named' | 'default';
  skipImport?: boolean;
};

export function registerCodeModHandlers() {
  ipcMain.handle('codemod:wrap-translation', async (_event, payload: WrapTranslationPayload) => {
    if (!payload.projectPath) {
      throw new Error('Project path is required to apply code modifications.');
    }
    if (!payload.relativePath) {
      throw new Error('File path is required.');
    }
    if (!payload.key.trim()) {
      throw new Error('Translation key is required.');
    }
    if (!payload.functionName.trim()) {
      throw new Error('Translation function name is required.');
    }

    const absolutePath = path.isAbsolute(payload.relativePath)
      ? payload.relativePath
      : path.join(payload.projectPath, payload.relativePath);

    const source = await fs.readFile(absolutePath, 'utf8');
    const ast = parse(source, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'optionalChaining',
        'nullishCoalescingOperator',
        ['decorators', { decoratorsBeforeExport: true }],
      ],
    });

    const normalizedTargetText = payload.text.trim();
    const targetLine = payload.line;
    const targetColumn = payload.column;
    let replaced = false;

    traverse(ast, {
      JSXText(pathNode) {
        if (replaced) return;
        if (!pathNode.node.loc) return;
        if (!matchesLocation(pathNode.node.loc.start)) return;
        if (pathNode.node.value.trim() !== normalizedTargetText) return;
        const call = buildTranslationCall(payload.functionName, payload.key);
        pathNode.replaceWith(t.jsxExpressionContainer(call));
        replaced = true;
      },
      StringLiteral(pathNode) {
        if (replaced) return;
        if (!pathNode.node.loc) return;
        if (!matchesLocation(pathNode.node.loc.start)) return;
        if (pathNode.node.value.trim() !== normalizedTargetText) return;
        const call = buildTranslationCall(payload.functionName, payload.key);
        pathNode.replaceWith(call);
        replaced = true;
      },
      TemplateLiteral(pathNode) {
        if (replaced) return;
        if (!pathNode.node.loc) return;
        if (pathNode.node.expressions.length > 0) return;
        if (!matchesLocation(pathNode.node.loc.start)) return;
        const raw = pathNode.node.quasis[0]?.value?.cooked ?? '';
        if (raw.trim() !== normalizedTargetText) return;
        const call = buildTranslationCall(payload.functionName, payload.key);
        pathNode.replaceWith(call);
        replaced = true;
      },
    });

    if (!replaced) {
      throw new Error('Unable to locate matching string in source file. Try rescanning to refresh line numbers.');
    }

    if (!payload.skipImport && payload.importSource?.trim()) {
      ensureImport(ast, {
        importSource: payload.importSource.trim(),
        importKind: payload.importKind ?? 'named',
        symbolName: payload.functionName.split('.')[0],
      });
    }

    const { code } = generate(ast, { retainLines: true });
    await fs.writeFile(absolutePath, code, 'utf8');
    return { success: true, path: absolutePath };

    function matchesLocation(loc: { line: number; column: number }) {
      return loc.line === targetLine && loc.column === targetColumn;
    }
  });

  ipcMain.handle(
    'codemod:check-dependency',
    async (_event, payload: { projectPath: string; packageName: string }) => {
      if (!payload.projectPath || !payload.packageName) {
        throw new Error('Project path and package name are required.');
      }
      const pkgPath = resolvePackageFolder(payload.projectPath, payload.packageName);
      try {
        await fs.access(pkgPath);
        return { installed: true };
      } catch {
        return { installed: false };
      }
    }
  );

  ipcMain.handle(
    'codemod:install-dependency',
    async (_event, payload: { projectPath: string; packageName: string }) => {
      if (!payload.projectPath || !payload.packageName) {
        throw new Error('Project path and package name are required.');
      }
      const manager = await detectPackageManager(payload.projectPath);
      await runPackageInstall(manager, payload.projectPath, payload.packageName);
      return { installed: true };
    }
  );
}

function buildTranslationCall(functionName: string, key: string) {
  const callTarget = buildCallee(functionName);
  return t.callExpression(callTarget, [t.stringLiteral(key)]);
}

function buildCallee(functionName: string) {
  const parts = functionName.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Translation function name is invalid.');
  }

  return parts.slice(1).reduce<t.MemberExpression | t.Identifier>(
    (acc, part) => t.memberExpression(acc, t.identifier(part)),
    t.identifier(parts[0])
  );
}

function ensureImport(
  ast: t.File,
  options: { importSource: string; importKind: 'named' | 'default'; symbolName: string }
) {
  const { importSource, importKind, symbolName } = options;
  if (!symbolName) return;

  const programBody = ast.program.body;
  let existingImport: t.ImportDeclaration | null = null;

  for (const node of programBody) {
    if (t.isImportDeclaration(node) && node.source.value === importSource) {
      existingImport = node;
      break;
    }
  }

  if (existingImport) {
    const hasSpecifier = existingImport.specifiers.some((specifier) => {
      if (importKind === 'named' && t.isImportSpecifier(specifier)) {
        return t.isIdentifier(specifier.imported, { name: symbolName });
      }
      if (importKind === 'default' && t.isImportDefaultSpecifier(specifier)) {
        return specifier.local.name === symbolName;
      }
      return false;
    });

    if (!hasSpecifier) {
      if (importKind === 'named') {
        existingImport.specifiers.push(
          t.importSpecifier(t.identifier(symbolName), t.identifier(symbolName))
        );
      } else {
        existingImport.specifiers.unshift(t.importDefaultSpecifier(t.identifier(symbolName)));
      }
    }
    return;
  }

  const specifiers =
    importKind === 'named'
      ? [t.importSpecifier(t.identifier(symbolName), t.identifier(symbolName))]
      : [t.importDefaultSpecifier(t.identifier(symbolName))];

  const importDeclaration = t.importDeclaration(specifiers, t.stringLiteral(importSource));
  const insertionIndex = programBody.findIndex(
    (node) => !(t.isExpressionStatement(node) && t.isStringLiteral(node.expression))
  );
  if (insertionIndex === -1) {
    programBody.push(importDeclaration);
  } else {
    programBody.splice(insertionIndex, 0, importDeclaration);
  }
}

function resolvePackageFolder(projectPath: string, packageName: string) {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    return path.join(projectPath, 'node_modules', scope, name ?? '');
  }
  return path.join(projectPath, 'node_modules', packageName);
}

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

async function detectPackageManager(projectPath: string): Promise<PackageManager> {
  const checks: Array<{ file: string; manager: PackageManager }> = [
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'bun.lockb', manager: 'bun' },
    { file: 'package-lock.json', manager: 'npm' },
  ];

  for (const check of checks) {
    try {
      await fs.access(path.join(projectPath, check.file));
      return check.manager;
    } catch {
      // continue
    }
  }

  return 'npm';
}

async function runPackageInstall(manager: PackageManager, cwd: string, packageName: string) {
  const commands: Record<PackageManager, { command: string; args: string[] }> = {
    npm: { command: 'npm', args: ['install', packageName] },
    yarn: { command: 'yarn', args: ['add', packageName] },
    pnpm: { command: 'pnpm', args: ['add', packageName] },
    bun: { command: 'bun', args: ['add', packageName] },
  };

  const { command, args } = commands[manager];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}


