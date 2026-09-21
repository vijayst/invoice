import { FastMCP, imageContent } from 'fastmcp';
import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);
const WORKSPACE_DIR = process.cwd();

const mcp = new FastMCP({
  name: 'Invoice Studio MCP',
  version: '1.0.0',
});

function resolveWorkspacePath(relativePath: string): string {
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(WORKSPACE_DIR, safePath);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(WORKSPACE_DIR) + path.sep) && resolved !== path.resolve(WORKSPACE_DIR)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }
  return resolved;
}

// 1. Read Template / Style
mcp.addTool({
  name: 'read_template_file',
  description: 'Read contents of a template or stylesheet file (e.g. src/templates/invoice.md).',
  parameters: z.object({
    filePath: z.string().describe('Relative path to file inside repository.'),
  }),
  execute: async ({ filePath }) => {
    const fullPath = resolveWorkspacePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.stringify({ content });
  },
});

// 2. Write / Modify Template or Style
mcp.addTool({
  name: 'write_template_file',
  description: 'Update contents of a template or style file.',
  parameters: z.object({
    filePath: z.string().describe('Relative path to file.'),
    content: z.string().describe('Full code or markup to write.'),
  }),
  execute: async ({ filePath, content }) => {
    const fullPath = resolveWorkspacePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    return JSON.stringify({ success: true, message: `Updated ${filePath}` });
  },
});

// 3. Run Build Generator
mcp.addTool({
  name: 'run_generate_build',
  description: 'Executes `npm run generate` to compile templates into PDF and output/preview.png.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const { stdout, stderr } = await execAsync('npm run generate', { cwd: WORKSPACE_DIR });
      return JSON.stringify({ success: true, stdout, stderr });
    } catch (error: unknown) {
      const err = error as { message?: string; stdout?: string; stderr?: string };
      return JSON.stringify({
        success: false,
        error: err.message ?? 'generate failed',
        stdout: err.stdout,
        stderr: err.stderr,
      });
    }
  },
});

// 4. Return Preview Image for Visual Inspection Loop
mcp.addTool({
  name: 'get_invoice_preview',
  description: 'Returns visual PNG preview of rendered invoice as base64 image payload.',
  parameters: z.object({
    imagePath: z.string().default('output/preview.png').describe('Relative path to preview PNG.'),
  }),
  execute: async ({ imagePath }) => {
    const resolvedImagePath = imagePath || 'output/preview.png';
    const fullPath = resolveWorkspacePath(resolvedImagePath);
    const image = await imageContent({ path: fullPath });
    return {
      content: [
        image,
        { type: 'text' as const, text: `Rendered preview from ${resolvedImagePath}` },
      ],
    };
  },
});

// 5. Check Git Working Directory Status
mcp.addTool({
  name: 'get_git_status',
  description: 'Inspect modified files and branch state before merging.',
  parameters: z.object({}),
  execute: async () => {
    const { stdout } = await execAsync('git status --short', { cwd: WORKSPACE_DIR });
    return JSON.stringify({ status: stdout || 'Working tree clean' });
  },
});

mcp.start({ transportType: 'stdio' });
