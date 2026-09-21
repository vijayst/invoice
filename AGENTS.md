# AGENTS.md

Instructions for AI agents working in this repository (Invoice Studio).

## Goal

Help the user iterate on the invoice **look** (Markdown template + CSS) and/or **monthly data**, then produce `output/invoice.pdf` and `output/preview.png`. Prefer a tight visual loop: edit → generate → inspect preview → repeat.

## Source of truth

| Path | Role |
|------|------|
| `src/templates/invoice.md` | Invoice layout (Markdown). Use `{{placeholders}}` / Handlebars helpers for data. |
| `src/styles/invoice.css` | Print/PDF styles. |
| `src/data/invoice-input.json` | Monthly invoice values (dates, amounts, parties, line items). |
| `scripts/generate-invoice.js` | Build pipeline — do not rewrite unless asked. |
| `src/mcp/index.ts` | MCP server — do not rewrite unless asked. |
| `output/*` | Generated artifacts — do not hand-edit; regenerate instead. |
| `USER-JOURNEY.md` | End-user path: MCP Registry → npx PDF loop → fork → export. |

Do **not** resurrect legacy root files (`invoice.md`, `invoice.css`, `convert.js`).

## Prefer MCP tools when available

If Invoice Studio MCP tools are connected, use them instead of raw shell/file edits when possible:

1. `read_template_file` — read `src/templates/invoice.md` or `src/styles/invoice.css` (or other repo-relative paths).
2. `write_template_file` — write the full updated file contents.
3. `run_generate_build` — runs `npm run generate`.
4. `get_invoice_preview` — load `output/preview.png` (default) as an image for visual QA.
5. `get_git_status` — check diffs before proposing a commit.
6. `get_workspace_root` — show whether the server is bound to an npx install or a clone.
7. `export_studio_to_repo` — copy template/CSS/data into an absolute path of a forked clone.

If MCP is unavailable, use normal editor/shell: edit the files above, then `npm run generate`, then open `output/preview.png`.

## Standard workflows

### A. Change layout / styling

1. Read `src/templates/invoice.md` and/or `src/styles/invoice.css`.
2. Apply a focused change (one concern at a time).
3. Run generate (`run_generate_build` or `npm run generate`).
4. Inspect the preview (`get_invoice_preview` or `output/preview.png`).
5. Fix issues and repeat until the preview matches the request.
6. Summarize what changed; use `get_git_status` before committing.

### B. New monthly invoice (data only)

1. Update `src/data/invoice-input.json` (invoice number, dates, line items, totals, parties as needed).
2. Keep placeholder names in `invoice.md` in sync if you add/rename fields.
3. Generate and verify preview + totals.
4. Tell the user where PDF/PNG landed (`output/invoice.pdf`, `output/preview.png`).

### C. Both data and template

Update data first if amounts/dates are wrong, then template/CSS for presentation. Always regenerate and check the preview before claiming success.

## Conventions

- Template language is **Markdown**, not HTML/Handlebars-as-page. Keep structure readable as MD; use HTML snippets only where the existing template already does (e.g. meta/wire tables).
- Preserve existing CSS class names (`.meta`, `.wire`, etc.) unless intentionally redesigning.
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
npm run generate     # markdown + data → PDF + preview.png
```

## Done checklist

- [ ] Intended files under `src/` updated
- [ ] `npm run generate` succeeded (or `run_generate_build` reported success)
- [ ] Preview inspected for the requested change
- [ ] No hand-edits left in `output/`
