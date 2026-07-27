# Locroot

**Find hard-coded UI strings, turn them into translation keys, and keep localization files in sync.**

Locroot is a desktop developer tool for internationalizing existing JavaScript and TypeScript projects. Point it at a codebase, scan for user-facing strings, review the candidates, generate translation keys, and apply codemods without manually hunting through every component.

It is built for the awkward middle ground between *“we should probably translate this app”* and spending a weekend replacing strings one by one like some sort of localization monk.

> Locroot is under active development. Back up or commit your project before applying automated code changes.

## What it does

Locroot helps with the repetitive parts of introducing and maintaining i18n in an existing project:

- scan `.tsx`, `.jsx`, `.ts`, and `.js` source files for translation candidates
- choose which folders should be included in a scan
- ignore generated or dependency directories
- review, filter, include, or exclude detected strings
- generate and edit translation-key suggestions
- compare candidates against an existing language file
- identify new, existing, and potentially obsolete keys
- preview language data before writing changes
- create and select language files
- apply translation-ready codemods to source code
- configure the translation function and import source
- manage and synchronize target locales

## Workflow

A typical Locroot session looks like this:

1. Open a project directory.
2. Select the folders Locroot should scan.
3. Review the detected user-facing strings.
4. Adjust generated translation keys where necessary.
5. Select or create the project's language file.
6. Review the resulting language data.
7. Apply codemods to replace hard-coded strings with translation calls.
8. Synchronize additional target locales when required.

The important bit is that Locroot keeps a human in the loop. Source rewriting is useful. Blind source rewriting is how developers acquire trust issues.

## Translation-ready codemods

Locroot can rewrite selected source strings to use a translation function. The codemod can be configured with:

- the translation function name
- the package or module providing it
- the import style
- an option to skip adding imports entirely

The default configuration targets a named `t` import from `i18next`, but projects are not required to follow that convention.

## Candidate and language analysis

Locroot compares selected candidates with the keys already present in the active language data and summarizes:

- total detected candidates
- selected candidates
- new translation keys
- keys that already exist
- potentially obsolete language keys

This gives you a useful reconciliation step before changing either the source tree or translation files.

## Translation management

Locroot also contains translation-provider settings and target-locale synchronization tooling. Translation progress is tracked in the UI so generated translations can be reviewed as part of the same workflow as extraction and codemods.

Automated translation should still be reviewed by someone who understands the language. Computers remain distressingly confident creatures.

## Getting started

### Requirements

- Node.js
- npm

Clone the repository and install dependencies:

```bash
git clone https://github.com/MadsenDev/Locale.git
cd Locale
npm install
npm run dev
```

`npm run dev` starts the Vite renderer, compiles the Electron process, and launches the desktop application.

## Development commands

```bash
npm run dev              # run Locroot in development mode
npm run build            # build renderer and Electron main process
npm test                 # run the Vitest test suite
npm run start            # start the compiled Electron app
npm run pack             # create an unpacked application build
npm run dist             # create distributable packages
```

## Packaging

Electron Builder is configured for:

| Platform | Target |
| --- | --- |
| Linux | AppImage |
| Windows | NSIS installer |
| macOS | Application package |

Build artifacts are written to `release/`.

## Tech stack

- Electron
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Babel parser/traverse tooling for source analysis and codemods
- Vitest

## Project status

Locroot is an early-stage developer tool. The current implementation already covers project scanning, candidate review, language-file management, key generation, source codemods, translation settings, and locale synchronization.

The core direction is intentionally narrow:

> **Make adding localization to an existing codebase less tedious without hiding the source changes from the developer.**

## Safety

Locroot can modify source files. Use it on a Git-controlled project and review the resulting diff before committing changes.

That is not glamorous documentation, but neither is discovering an enthusiastic codemod rewrote 83 files without a clean working tree.

## License

Check the repository for the current license terms before redistributing or incorporating Locroot into another project.