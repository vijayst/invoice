# Invoice Studio

Markdown invoice templates with an MCP server for interactive editing (Claude Desktop / Cursor / Windsurf) and a headless generate pipeline for monthly PDF runs.

## How it works

**Phase 1 — Interactive studio:** an AI client connects to the MCP server over stdio. You ask it to tweak the template or styles, regenerate, and inspect the preview PNG until the layout looks right.

**Phase 2 — Monthly execution:** update `src/data/invoice-input.json` (or inject it from CI), then run `npm run generate` to produce `output/invoice.pdf` and `output/preview.png`.

```
src/templates/invoice.md   ← Markdown template ({{placeholders}} for data)
src/styles/invoice.css     ← Print styles
src/data/invoice-input.json
        │
        ▼  npm run generate
output/invoice.md          ← rendered markdown
output/invoice.html
output/invoice.pdf
output/preview.png         ← used by get_invoice_preview
```

## Setup

```bash
npm install
npm run build:mcp
```

Chrome or Chromium is required for PDF/PNG rendering. The generate script finds common install paths (macOS / Linux / Windows). If needed:

```bash
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

## Generate an invoice (headless)

1. Edit monthly fields in `src/data/invoice-input.json` (amounts, dates, line items, etc.).
2. Optionally adjust layout in `src/templates/invoice.md` or `src/styles/invoice.css`.
3. Run:

```bash
npm run generate
```

Artifacts land in `output/`.

## Use the MCP to edit and generate

### 1. Build and point your client at the server

```bash
npm run build:mcp
```

**Cursor** — add to MCP settings (`.cursor/mcp.json` or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "invoice-studio": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/invoice"
    }
  }
}
```

**Claude Desktop** — in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "invoice-studio": {
      "command": "node",
      "args": ["/absolute/path/to/invoice/dist/index.js"],
      "cwd": "/absolute/path/to/invoice"
    }
  }
}
```

`cwd` must be the repo root so tools read/write the right files and `npm run generate` works.

Smithery users can install via `smithery.yaml` (`npm run build:mcp` then `node dist/index.js`).

### 2. Interactive edit loop

Ask the model something like:

> Read `src/templates/invoice.md` and tighten the payment section. Regenerate and show me the preview.

Typical tool sequence:

| Tool | Purpose |
|------|---------|
| `read_template_file` | Read `src/templates/invoice.md` or `src/styles/invoice.css` |
| `write_template_file` | Write updated template/CSS |
| `run_generate_build` | Runs `npm run generate` → PDF + `output/preview.png` |
| `get_invoice_preview` | Returns the preview PNG for visual review |
| `get_git_status` | Check what changed before committing |

Repeat edit → generate → preview until satisfied, then commit.

### 3. Scripts reference

| Script | Command |
|--------|---------|
| Build MCP | `npm run build:mcp` |
| Start MCP (stdio) | `npm run start:mcp` |
| Generate PDF/PNG | `npm run generate` |

## Project layout

```
├── smithery.yaml
├── package.json
├── src/
│   ├── templates/invoice.md
│   ├── styles/invoice.css
│   ├── data/invoice-input.json
│   └── mcp/index.ts
├── scripts/generate-invoice.js
└── output/preview.png
```
