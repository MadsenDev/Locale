# Locroot

> [!IMPORTANT]
> **Locroot is no longer actively developed. It has been superseded by [Tunga](https://github.com/vardirhq/tunga).**
>
> This repository is kept for historical reference. For current localization tooling and future development, use Tunga instead.

Locroot was a desktop developer tool for internationalizing existing JavaScript and TypeScript projects. It focused on finding hard-coded user-facing strings, turning them into translation keys, managing locale files, and applying codemods to source code.

The project explored the workflow that later evolved into **Tunga**.

## What Locroot did

Locroot handled much of the repetitive work involved in introducing i18n into an existing codebase:

- scanned `.tsx`, `.jsx`, `.ts`, and `.js` files for translation candidates
- allowed folders and generated directories to be included or excluded from scans
- let developers review, filter, include, or exclude detected strings
- generated editable translation-key suggestions
- compared candidate keys with an existing language file
- identified new, existing, and potentially obsolete translation keys
- created and selected language files
- applied translation-ready codemods to source code
- supported configurable translation functions and import sources
- managed target locales and translation synchronization

## Typical workflow

A Locroot session generally looked like this:

1. Open a project directory.
2. Select the folders to scan.
3. Review detected user-facing strings.
4. Adjust suggested translation keys.
5. Select or create the project's language file.
6. Review the resulting language data.
7. Apply codemods to replace hard-coded strings with translation calls.
8. Synchronize additional target locales.

The goal was to keep the developer in control of source changes rather than treating localization as a blind one-click transformation.

## Translation-ready codemods

Locroot could rewrite selected strings to use a translation function. The codemod supported configuration for:

- translation function name
- package or module providing it
- import style
- skipping import generation entirely

The default setup targeted a named `t` import from `i18next`, while still allowing projects to use a different convention.

## Candidate and language analysis

Locroot compared selected translation candidates with the active language data and summarized:

- total detected candidates
- selected candidates
- new keys
- existing keys
- potentially obsolete keys

This provided a reconciliation step before changing either source code or locale files.

## Tech stack

Locroot was built with:

- Electron
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Babel parser and traversal tooling for source analysis and codemods
- Vitest

## Running the historical project

This codebase is no longer the recommended localization tool, but it can still be run for development or reference.

### Requirements

- Node.js
- npm

```bash
git clone https://github.com/MadsenDev/Locale.git
cd Locale
npm install
npm run dev
```

Useful commands:

```bash
npm run dev      # development mode
npm run build    # build renderer and Electron process
npm test         # run Vitest
npm run start    # start the compiled Electron app
npm run pack     # create an unpacked application build
npm run dist     # create distributable packages
```

Electron Builder was configured for Linux AppImage, Windows NSIS, and macOS application builds.

## Successor: Tunga

Locroot should be considered a **legacy predecessor**, not a parallel active product.

Development has moved to:

**[vardirhq/tunga](https://github.com/vardirhq/tunga)**

Tunga carries forward the localization-focused direction while replacing Locroot as the project to use and develop going forward.

## Repository status

- **Status:** Superseded / legacy
- **Active development:** No
- **Successor:** [Tunga](https://github.com/vardirhq/tunga)

This repository remains available as a record of the earlier implementation and its design ideas.

## License

Check the repository for the applicable license terms before redistributing or incorporating this historical code into another project.