# AGENTS.md

Instructions for AI agents working in this repository (Invoice Studio).

## Goal

Help the user iterate on the invoice **look** and/or **monthly data**, then produce a PDF and preview PNG. Prefer a tight visual loop: edit → generate → inspect preview → repeat.

Three generate paths:

| Path | Template | Data | Command | Preview |
|------|----------|------|---------|---------|
| Markdown + Handlebars | `src/templates/invoice.md` | `src/data/invoice-input.json` | `npm run generate` | `output/preview.png` |
| Handlebars + Tailwind CDN | `src/templates/invoice.hbs` | `src/data/invoice-input.json` | `npm run generate:hbs` | `output/preview-hbs.png` |
| Raw Markdown | `src/templates/invoice-raw.md` | Values written in the Markdown | `npm run generate:raw` | `output/preview-raw.png` |

Use the path the user is editing. `run_generate_build` runs only `npm run generate`. For the other two, run the npm script, then `get_invoice_preview` with `imagePath` set to that preview.

## Source of truth

| Path | Role |
|------|------|
| `src/templates/invoice.md` | Markdown layout. Use `{{placeholders}}` / Handlebars helpers for data. |
| `src/templates/invoice.hbs` | HTML layout styled with Tailwind utility classes. Handlebars fills data. Tailwind loads from the CDN at PDF time. |
| `src/templates/invoice-raw.md` | Markdown invoice with dates, amounts, parties, and line items written in. No Handlebars. |
| `src/styles/invoice.css` | Print/PDF styles for `invoice.md` and `invoice-raw.md`. |
| `src/data/invoice-input.json` | Monthly invoice values for the Handlebars pipelines (`invoice.md`, `invoice.hbs`). |
| `scripts/generate-invoice.js` | Markdown + Handlebars pipeline — do not rewrite unless asked. |
| `scripts/generate-invoice-hbs.js` | Handlebars + Tailwind CDN pipeline — do not rewrite unless asked. |
| `scripts/generate-invoice-raw.js` | Raw Markdown pipeline — do not rewrite unless asked. |
| `src/mcp/index.ts` | MCP server — do not rewrite unless asked. |
| `output/*` | Generated artifacts — do not hand-edit; regenerate instead. |
| `USER-JOURNEY.md` | End-user path: MCP Registry → npx PDF loop → fork → export. |

Do **not** resurrect legacy root files (`invoice.md`, `invoice.css`, `convert.js`).

## Prefer MCP tools when available

If Invoice Studio MCP tools are connected, use them instead of raw shell/file edits when possible:

1. `read_template_file` — read `src/templates/invoice.md` or `src/styles/invoice.css` (or other repo-relative paths).
2. `write_template_file` — write the full updated file contents.
3. `run_generate_build` — runs `npm run generate`.
4. `get_invoice_preview` — load a preview PNG. Default is `output/preview.png`. Pass `output/preview-hbs.png` or `output/preview-raw.png` after those generators.
5. `get_git_status` — check diffs before proposing a commit.
6. `get_workspace_root` — show whether the server is bound to an npx install or a clone.
7. `export_studio_to_repo` — copy template/CSS/data into an absolute path of a forked clone.

If MCP is unavailable, use normal editor/shell: edit the template for the path you are on, run the matching `npm run generate`, `npm run generate:hbs`, or `npm run generate:raw`, then open that path’s preview PNG.

## Standard workflows

### A. Change layout / styling

1. Read `src/templates/invoice.md` and/or `src/styles/invoice.css`.
2. Apply a focused change (one concern at a time).
3. Run generate (`run_generate_build` or `npm run generate`).
4. Inspect the preview (`get_invoice_preview` or `output/preview.png`).
5. Fix issues and repeat until the preview matches the request.
6. Summarize what changed; use `get_git_status` before committing.

### B. New monthly invoice (data only)

For `invoice.md` and `invoice.hbs`, update `src/data/invoice-input.json` (invoice number, dates, line items, totals, parties as needed). Keep placeholder names in sync if you add or rename fields. Run `npm run generate` and/or `npm run generate:hbs`, verify the preview and totals, and tell the user where the PDF and PNG landed.

For `invoice-raw.md`, edit the values in that file and run `npm run generate:raw` (workflow E).

### C. Both data and template

Update data first if amounts/dates are wrong, then template/CSS for presentation. Always regenerate and check the preview before claiming success.

### D. Handlebars + Tailwind (`invoice.hbs`)

1. Read `src/templates/invoice.hbs`. Style with Tailwind utility classes on the HTML. Keep `{{placeholders}}` aligned with `src/data/invoice-input.json`.
2. Leave Tailwind on the CDN script already in the template (`https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4`). Do not add a CSS compile step to `scripts/generate-invoice-hbs.js`.
3. Run `npm run generate:hbs` (needs network so Chrome can load the CDN).
4. Inspect `output/preview-hbs.png` (`get_invoice_preview` with that `imagePath`).
5. PDF is `output/invoice-hbs.pdf`.

### E. Raw Markdown (`invoice-raw.md`)

1. Read `src/templates/invoice-raw.md`.
2. Put monthly values in the Markdown itself (invoice number, dates, parties, line items, totals, payment block). Do not add Handlebars syntax. Do not read `invoice-input.json` from `scripts/generate-invoice-raw.js`.
3. Layout changes for this path go in the Markdown and, when needed, `src/styles/invoice.css` (shared with `invoice.md`).
4. Run `npm run generate:raw`.
5. Inspect `output/preview-raw.png`. PDF is `output/invoice-raw.pdf`.

## Conventions

- `invoice.md` and `invoice-raw.md` stay readable Markdown. Use HTML snippets only where those files already do (e.g. meta/wire tables).
- `invoice.hbs` is an HTML page. Style it with Tailwind classes. Keep the CDN script tag.
- Preserve existing CSS class names (`.meta`, `.wire`, etc.) unless intentionally redesigning the Markdown invoices.
- After template/CSS/data edits, **always regenerate** before finishing — never assume the old preview is current.
- Chrome/Chromium is required. If generate fails on missing browser, suggest setting `CHROME_PATH` to the local Chrome binary (macOS example: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).
- Rebuild the MCP server only when changing `src/mcp/`: `npm run build:mcp`.
- MCP entrypoint is `dist/index.js`. Clients must use an **absolute** path (or Cursor `${workspaceFolder}/dist/index.js`). Relative `dist/index.js` often resolves under the home directory and fails with `Cannot find module '.../dist/index.js'`.
- The MCP server roots file ops at the repo containing `dist/index.js`, not `process.cwd()`.

## Commands

```bash
npm install
npm run build:mcp    # compile MCP → dist/index.js
npm run start:mcp    # stdio MCP server (clients launch this)
npm run generate      # invoice.md + JSON → output/invoice.pdf + output/preview.png
npm run generate:hbs  # invoice.hbs + JSON + Tailwind CDN → output/invoice-hbs.pdf + output/preview-hbs.png
npm run generate:raw  # invoice-raw.md → output/invoice-raw.pdf + output/preview-raw.png
```

## Done checklist

- [ ] Intended files under `src/` updated
- [ ] The matching generate command succeeded (`npm run generate`, `generate:hbs`, or `generate:raw`, or `run_generate_build` for the Markdown + Handlebars path)
- [ ] Preview inspected for the requested change
- [ ] No hand-edits left in `output/`
