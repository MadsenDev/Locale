const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, '..', 'dist-electron');
const sourcePkg = path.join(rootDir, '..', 'electron', 'package.json');
const targetPkg = path.join(distDir, 'package.json');

fs.mkdirSync(distDir, { recursive: true });

const pkgContents = fs.readFileSync(sourcePkg, 'utf8');
fs.writeFileSync(targetPkg, pkgContents);

console.log(`Ensured CommonJS package at ${targetPkg}`);

