# Invoice Studio user journey

This is the path for someone who finds Invoice Studio in the **public MCP Registry**, designs an invoice with the installed server, then keeps that work in **their own GitHub fork**.

The registry is a catalog (name, description, how to start the npm package). It does not host your files or run the server in the cloud.

## Prerequisites

- Node.js
- Chrome or Chromium (PDF/PNG generation)
- An MCP client such as Cursor or Claude Desktop
- A GitHub account (only needed when you fork)

Registry / npm names:

- MCP: `io.github.vijayst/invoice-studio`
- Package: `@vijayst/invoice-studio`
- Source: [github.com/vijayst/invoice](https://github.com/vijayst/invoice)

## Stage 1 — Discover and install

1. Search the [official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.vijayst/invoice-studio) for Invoice Studio.
2. Add the server in the client. Typical config:

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

3. Reload MCP so the client starts the process.

`npx` downloads `@vijayst/invoice-studio` and runs it. The MCP’s workspace is that **install folder** (including sample `src/data/invoice-input.json`), not your home directory and not someone else’s machine.

You can ask `get_workspace_root` if you need the exact path on disk.

## Stage 2 — Design and get a PDF (no clone yet)

You already have a working studio. You do **not** need to fork or clone to produce a PDF.

Ask the agent to iterate, for example:

> Read the invoice template, update the line items and totals, regenerate, and show the preview.

Typical loop:

| Step | Tool | Result |
|------|------|--------|
| Read layout / styles | `read_template_file` | Markdown template or CSS |
| Edit layout / styles / data | `write_template_file` | Files in the npx workspace |
| Render | `run_generate_build` | `output/invoice.pdf` and `output/preview.png` |
| Visual check | `get_invoice_preview` | Preview image in the chat |

If Chrome is missing, set `CHROME_PATH` to the browser binary and generate again.

When the preview looks right, you have an invoice PDF **inside the npx copy**. That copy can disappear when the npx cache is cleaned, so treat this stage as a design loop.

## Stage 3 — Fork the public repo

When you want a durable project (git, monthly updates, your GitHub):

1. Fork [vijayst/invoice](https://github.com/vijayst/invoice) to your account.
2. Clone **your fork** to a folder you control, for example:

```bash
git clone https://github.com/YOUR_USER/invoice.git
cd invoice
```

Leave the registry/`npx` MCP connected. You still need it to read the templates you just designed.

## Stage 4 — Copy npx work into the fork

The designed files live in the npx workspace, not in the fresh clone. Ask the agent (give the **absolute** path of the clone):

> Export my studio files into `/absolute/path/to/my-fork`

`export_studio_to_repo` copies:

- `src/templates/invoice.md`
- `src/styles/invoice.css`
- `src/data/invoice-input.json`

from the running MCP workspace into that directory.

To copy only template and CSS, say so; the tool can skip the JSON (`includeData: false`).

## Stage 5 — Run the studio from your clone

In the clone:

```bash
npm install
npm run build:mcp
```

Open that folder in Cursor, or point MCP at **this** `dist/index.js` instead of `npx`:

```json
{
  "mcpServers": {
    "invoice-studio": {
      "command": "node",
      "args": ["/absolute/path/to/my-fork/dist/index.js"]
    }
  }
}
```

Reload MCP. Later `write_template_file` / `run_generate_build` writes go to your repo. Commit and push to your fork.

Monthly invoices: edit `src/data/invoice-input.json` (or ask the agent to), regenerate, send `output/invoice.pdf`.

## What each piece is for

| Piece | Role |
|-------|------|
| MCP Registry | Find the server and install metadata |
| `npx @vijayst/invoice-studio` | Instant studio + sample data + PDF loop |
| GitHub fork + clone | Your long-lived project |
| `export_studio_to_repo` | Move the npx template/CSS/data into that clone |
| Clone + `dist/index.js` | Ongoing edits and invoices you keep in git |
