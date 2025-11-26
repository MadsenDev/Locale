Build a desktop app called "LocaleForge" using:

- Vite + React + TypeScript
- Electron (main + renderer)
- Tailwind CSS 3.4.x
- framer-motion
- react-icons

The app helps developers extract UI strings from a codebase and generate or update i18n JSON translation files.

## High-level idea

LocaleForge is an Electron desktop app where the user:

1. Selects a project root folder.
2. Selects or creates a base language JSON file (e.g. `locales/en.json`).
3. The app scans source files (e.g. `.js`, `.ts`, `.jsx`, `.tsx`) for candidate UI strings.
4. The user reviews detected strings in a table, tweaks suggested keys, and chooses which to include.
5. The app generates or updates the base language JSON file with the chosen keys.
6. (Later feature) The app syncs those keys to other language JSON files (e.g. `no.json`, `de.json`), adding missing keys.

Focus on a clean, minimal UI and a simple first version.

---

## Tech architecture

Use Electron with Vite + React as the renderer:

- **Electron main process**
  - Manages the application window, menu, tray.
  - Handles filesystem access and project scanning.
  - Reads/writes JSON language files.
  - Exposes IPC handlers for the renderer.

- **Renderer (React)**
  - SPA built with Vite.
  - Styled with Tailwind 3.4.x.
  - Uses framer-motion for small transitions and animations.
  - Uses react-icons for icons (folder, file, settings, etc.).
  - Talks to the main process via IPC to trigger scans and save JSON files.

Keep structure roughly like:

- `/electron` → main process code (Electron bootstrap, IPC handlers, scanner utilities)
- `/src` → React app (pages, components, hooks, context)
- `/src/styles` → Tailwind setup

---

## IPC interface (example)

Define IPC channels roughly like this:

- `project:scan`  
  - Input: `{ rootPath: string, extensions: string[], ignore: string[] }`
  - Output: `{ candidates: CandidateString[] }`

- `lang:load`  
  - Input: `{ path: string }`
  - Output: `{ data: any }` (parsed JSON)

- `lang:save`  
  - Input: `{ path: string, data: any }`
  - Output: `{ success: boolean }`

- `lang:sync` (later)  
  - Input: `{ basePath: string, otherPaths: string[] }`
  - Output: `{ report: SyncReport }`

Types:

```ts
type CandidateString = {
  id: string;       // stable ID, e.g. hash of text + file + line
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;  // short snippet of surrounding code
};


---

String scanning (MVP)

In the Electron backend, implement a simple scanner:

Use fast-glob or similar to find files with given extensions.

Parse files with Babel/TypeScript (e.g. @babel/parser + @babel/traverse).

For the initial version, only extract candidate strings from:

JSX/TSX text nodes, e.g. <Button>Save changes</Button>

Possibly from specific props like label, title, placeholder, aria-label later.



Return a list of CandidateString objects to the renderer.


---

JSON structure & behavior

Assume the base language file looks like this:

{
  "buttons": {
    "save_changes": "Save changes"
  },
  "titles": {
    "profile_settings": "Profile settings"
  }
}

When the user accepts a string, the app:

1. Suggests a key based on the string, e.g.
"Save changes" → buttons.save_changes
"Profile settings" → titles.profile_settings

Use a basic heuristic: lowercase, spaces → _, strip punctuation.

Allow the user to edit the key in the UI.



2. If the key doesn’t exist in the base file, add it:

key → original text in the base language (e.g. English).



3. If the key already exists:

Mark it as "already present" and do not overwrite by default.



4. Also detect "obsolete" keys:

Keys present in the JSON file but for which no string was found in the latest scan.

Show them in the UI as “possibly obsolete” but do not delete automatically.




Later, for sync:

Ensure that every key in base language JSON exists in each selected target language JSON.

For new keys in base:

Add empty string or copy base text as placeholder.


Optionally mark missing/obsolete keys in a summary report.



---

UI / pages

Use a simple multi-step layout.

1. Project Setup screen

Components:

Folder picker for project root.

File picker for base language file (en.json), with option to "Create new".

Input fields for:

file extensions to scan (comma-separated, default .js,.jsx,.ts,.tsx)

ignore patterns (e.g. node_modules,dist,.git).



Button: Scan project.


Use framer-motion for subtle page transitions.

2. Scan Results screen

Shows a table of candidate strings:

Columns:

[checkbox] Include

Original text

Suggested key (editable text input)

File path

Line number

Status (new / existing)


Features:

Search filter for text and file path.

Bulk select/deselect.

Button: Generate keys (auto-fill key suggestions for selected rows).

Button: Apply to base language (updates/creates en.json via IPC).



3. Summary / Apply screen

Show summary:

Number of new keys added.

Number of existing keys recognized.

Number of obsolete keys detected.


Button to open the base language file in the system file explorer.

(Later) Link to "Language Sync" screen.


4. Language Sync screen (later)

List of language files:

en.json (base, read-only)

no.json, de.json, etc.


Show per-file stats:

Missing keys count.

Obsolete keys count.


Button: Sync from base (adds missing keys).

Show a small report once done.



---

Styling and UX

Use Tailwind 3.4.x for layout and styling.

Overall aesthetic:

Neutral/gray background, card-based layout.

Top navbar with app name and a settings icon (react-icons).


Use framer-motion for:

Page transitions.

Subtle motion on hovering buttons, rows, etc.


Use react-icons for:

Folder icon next to project path.

File icon for language file.

Refresh/Scan icon.

Check/warning icons in the summary.




---

Scripts & packaging

Set up scripts like:

dev → run Vite dev server + Electron in dev mode.

build → build React app and Electron bundle.

lint → optional ESLint.

Configure an Electron builder (e.g. electron-builder or electron-forge) to produce installers for at least one platform.



---

Nice-to-have (not required for MVP)

Support additional frameworks (Vue, Svelte) by adjusting the scanner rules.

Allow per-project settings to be saved and reloaded.

Show a visual diff of the base JSON before and after applying changes.

Import/export project config as JSON.


Focus first on:

Project setup

Scanning React/TSX

Reviewing candidates

Updating a base en.json file
