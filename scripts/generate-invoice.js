#!/usr/bin/env node
import { existsSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, '..');

const TEMPLATE_PATH = path.join(WORKSPACE_DIR, 'src/templates/invoice.md');
const STYLES_PATH = path.join(WORKSPACE_DIR, 'src/styles/invoice.css');
const DATA_PATH = path.join(WORKSPACE_DIR, 'src/data/invoice-input.json');
const OUTPUT_DIR = path.join(WORKSPACE_DIR, 'output');
const MD_OUT = path.join(OUTPUT_DIR, 'invoice.md');
const HTML_OUT = path.join(OUTPUT_DIR, 'invoice.html');
const PDF_OUT = path.join(OUTPUT_DIR, 'invoice.pdf');
const PREVIEW_OUT = path.join(OUTPUT_DIR, 'preview.png');

marked.setOptions({ gfm: true, breaks: true });

function chromeCandidates() {
  const home = os.homedir();
  return [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    // Linux
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
}

/**
 * Prefer an explicit existing binary; otherwise let puppeteer-core resolve
 * the installed Chrome channel (works on macOS / Windows / Linux).
 */
function resolveBrowserLaunchOptions() {
  for (const candidate of chromeCandidates()) {
    if (existsSync(candidate)) {
      return { executablePath: candidate };
    }
  }
  return { channel: 'chrome' };
}

function wrapHtml(bodyHtml, styles) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice</title>
  <style>
${styles}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function renderMarkdown() {
  const [templateSource, styles, rawData] = await Promise.all([
    fs.readFile(TEMPLATE_PATH, 'utf-8'),
    fs.readFile(STYLES_PATH, 'utf-8'),
    fs.readFile(DATA_PATH, 'utf-8'),
  ]);

  const data = JSON.parse(rawData);
  const markdown = Handlebars.compile(templateSource)(data);
  const bodyHtml = marked.parse(markdown);
  const html = wrapHtml(bodyHtml, styles);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(MD_OUT, markdown, 'utf-8');
  await fs.writeFile(HTML_OUT, html, 'utf-8');
  return html;
}

async function renderArtifacts(html) {
  const browserOptions = resolveBrowserLaunchOptions();
  let browser;
  try {
    browser = await puppeteer.launch({
      ...browserOptions,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (error) {
    const hint =
      'Install Google Chrome, or set CHROME_PATH / PUPPETEER_EXECUTABLE_PATH to your Chrome binary.';
    throw new Error(`${error instanceof Error ? error.message : error}\n${hint}`);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 850, height: 1100, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: PDF_OUT,
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });

    await page.screenshot({
      path: PREVIEW_OUT,
      type: 'png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Compiling invoice markdown…');
  const html = await renderMarkdown();
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, MD_OUT)}`);
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, HTML_OUT)}`);

  console.log('Rendering PDF and preview PNG…');
  await renderArtifacts(html);
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, PDF_OUT)}`);
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, PREVIEW_OUT)}`);
  console.log('Done');
}

main().catch((error) => {
  console.error('generate-invoice failed:', error);
  process.exit(1);
});
