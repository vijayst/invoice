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
| See install path | `get_workspace_root` | Directory this MCP is using |
| Later: save into a fork | `export_studio_to_repo` | Stage 4 — not needed until you clone |

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

## Stage 4 — Copy npx work into the fork (`export_studio_to_repo`)

The designed files live in the npx workspace, not in the fresh clone. Keep the registry/`npx` MCP connected and ask the agent, with the **absolute** path of the clone:

> Export my studio files into `/absolute/path/to/my-fork`

That calls **`export_studio_to_repo`**. It copies these files from the running MCP workspace into the destination (overwriting the fork’s copies):

| Source in npx workspace | Destination in the clone |
|-------------------------|--------------------------|
| `src/templates/invoice.md` | `src/templates/invoice.md` |
| `src/styles/invoice.css` | `src/styles/invoice.css` |
| `src/data/invoice-input.json` | `src/data/invoice-input.json` |

### Tool parameters

| Parameter | Required | Default | Meaning |
|-----------|----------|---------|---------|
| `destinationDir` | yes | — | Absolute path to the cloned fork (the folder that contains `src/` and `package.json`). Relative paths are rejected. |
| `includeData` | no | `true` | If `false`, skip `invoice-input.json` and copy only template + CSS. |

The destination directory must already exist. The tool creates `src/templates`, `src/styles`, and `src/data` under it if they are missing, then `copyFile`s the three studio files.

Optional: ask `get_workspace_root` first if you want to confirm you are exporting **from** the npx install, not from some other checkout.

### Example prompts

- Template, CSS, and sample/edited JSON:

  > Export my studio files into `/Users/YOU/invoice`

- Layout only (keep the fork’s existing JSON):

  > Export only the template and CSS into `/Users/YOU/invoice`

### What the tool returns

JSON with `success`, `sourceRoot` (npx or current MCP workspace), `destinationDir`, `copied`, `skipped`, and a `nextStep` reminder to install, build, and point MCP at the clone’s `dist/index.js`.

It does **not** run `git`, `npm install`, or switch your MCP config. You still do Stage 5 after the copy.

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
| `get_workspace_root` | Show the folder the running MCP reads/writes |
| `export_studio_to_repo` | Copy template, CSS, and (optionally) JSON from that folder into your clone |
| Clone + `dist/index.js` | Ongoing edits and invoices you keep in git |
