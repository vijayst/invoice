# Invoice Studio

Invoice templates with an MCP server for interactive editing (Claude Desktop / Cursor / Windsurf) and three headless generate pipelines for monthly PDF runs.

Agents: see [AGENTS.md](./AGENTS.md) for the edit → generate → preview workflow. Registry → PDF → fork: [USER-JOURNEY.md](./USER-JOURNEY.md).

## How it works

**Phase 1 — Interactive studio:** an AI client connects to the MCP server over stdio. You ask it to tweak the template or styles, regenerate, and inspect the preview PNG until the layout looks right.

**Phase 2 — Monthly execution:** pick one of the three generate commands below. The default pipeline updates `src/data/invoice-input.json` (or injects it from CI), then runs `npm run generate` to produce `output/invoice.pdf` and `output/preview.png`.

### Markdown + Handlebars (`npm run generate`)

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

Handlebars fills `src/templates/invoice.md` from `src/data/invoice-input.json`. Marked turns that Markdown into HTML, `src/styles/invoice.css` styles it, and headless Chrome writes the PDF and preview.

### Handlebars + Tailwind CDN (`npm run generate:hbs`)

```
src/templates/invoice.hbs  ← HTML template ({{placeholders}} + Tailwind classes)
src/data/invoice-input.json
        │
        ▼  npm run generate:hbs
output/invoice-hbs.html
output/invoice-hbs.pdf
output/preview-hbs.png
```

`scripts/generate-invoice-hbs.js` compiles `src/templates/invoice.hbs` with the same JSON. Styling is Tailwind utility classes in the template. The page loads Tailwind from `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4`, so this command needs network access. The script does not compile a CSS file.

### Raw Markdown (`npm run generate:raw`)

```
src/templates/invoice-raw.md  ← Markdown with invoice values written in
src/styles/invoice.css
        │
        ▼  npm run generate:raw
output/invoice-raw.html
output/invoice-raw.pdf
output/preview-raw.png
```

`src/templates/invoice-raw.md` contains the invoice text itself (dates, amounts, parties, line items). `scripts/generate-invoice-raw.js` converts that file with Marked and `src/styles/invoice.css`. This path does not read `invoice-input.json` and does not run Handlebars. Change the Markdown when the month’s values change.

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

**Markdown + Handlebars**

1. Edit monthly fields in `src/data/invoice-input.json` (amounts, dates, line items, etc.).
2. Optionally adjust layout in `src/templates/invoice.md` or `src/styles/invoice.css`.
3. Run `npm run generate`.

**Handlebars + Tailwind**

1. Edit `src/data/invoice-input.json` for monthly values.
2. Adjust layout with Tailwind classes in `src/templates/invoice.hbs`.
3. Run `npm run generate:hbs` (requires network so Chrome can load the Tailwind CDN).

**Raw Markdown**

1. Edit the values directly in `src/templates/invoice-raw.md`.
2. Optionally adjust `src/styles/invoice.css`.
3. Run `npm run generate:raw`.

Artifacts land in `output/`.

## Use the MCP to edit and generate

### 1. Build and point your client at the server

```bash
npm install
npm run build:mcp   # required — creates dist/index.js
```

**Cursor (recommended):** this repo includes `.cursor/mcp.json`. Open the project folder in Cursor, then reload MCP / the window. It uses `${workspaceFolder}/dist/index.js` so the path is always the repo root.

If you configure MCP manually in Cursor Settings, use the **absolute** path to `dist/index.js` (relative `dist/index.js` alone resolves under your home directory and fails):

```json
{
  "mcpServers": {
    "invoice-studio": {
      "command": "node",
      "args": ["/Users/YOU/Documents/invoice/dist/index.js"]
    }
  }
}
```

**Claude Desktop** — in `claude_desktop_config.json` (absolute paths required):

```json
{
  "mcpServers": {
    "invoice-studio": {
      "command": "node",
      "args": ["/Users/YOU/Documents/invoice/dist/index.js"]
    }
  }
}
```

The server locates the repo from its own script path, so tools always read/write this project even if the client’s cwd is wrong.

### Public MCP Registry

Registry name: `io.github.vijayst/invoice-studio` (npm: [`@vijayst/invoice-studio`](https://www.npmjs.com/package/@vijayst/invoice-studio)). After publish, search the [official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.vijayst/invoice-studio).

Clients that install from the registry typically run:

```json
{
  "mcpServers": {
    "invoice-studio": {
      "command": "npx",
      "args": ["-y", "@vijayst/invoice-studio"]
    }
  }
}
```

`npx` runs a copy of this repo (sample data included). You can generate `output/invoice.pdf` in that copy, then fork this repo and export the template into the clone.

Full walkthrough: [USER-JOURNEY.md](./USER-JOURNEY.md).

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
| `get_workspace_root` | Show the npx or clone directory this server is using |
| `export_studio_to_repo` | Copy template/CSS/data from this workspace into a cloned fork |

Repeat edit → generate → preview until satisfied, then commit.

### 3. Scripts reference

| Script | Command |
|--------|---------|
| Build MCP | `npm run build:mcp` |
| Start MCP (stdio) | `npm run start:mcp` |
| Markdown + Handlebars PDF | `npm run generate` |
| Handlebars + Tailwind CDN PDF | `npm run generate:hbs` |
| Raw Markdown PDF | `npm run generate:raw` |

## Project layout

```
├── smithery.yaml
├── package.json
├── src/
│   ├── templates/invoice.md
│   ├── templates/invoice.hbs
│   ├── templates/invoice-raw.md
│   ├── styles/invoice.css
│   ├── data/invoice-input.json
│   └── mcp/index.ts
├── scripts/generate-invoice.js
├── scripts/generate-invoice-hbs.js
├── scripts/generate-invoice-raw.js
└── output/preview.png
```
