#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, '..');

const TEMPLATE_PATH = path.join(WORKSPACE_DIR, 'src/templates/invoice.hbs');
const STYLES_PATH = path.join(WORKSPACE_DIR, 'src/styles/invoice.css');
const DATA_PATH = path.join(WORKSPACE_DIR, 'src/data/invoice-input.json');
const OUTPUT_DIR = path.join(WORKSPACE_DIR, 'output');
const HTML_OUT = path.join(OUTPUT_DIR, 'invoice.html');
const PDF_OUT = path.join(OUTPUT_DIR, 'invoice.pdf');
const PREVIEW_OUT = path.join(OUTPUT_DIR, 'preview.png');

function resolveChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  return candidates[0];
}

async function renderHtml() {
  const [templateSource, styles, rawData] = await Promise.all([
    fs.readFile(TEMPLATE_PATH, 'utf-8'),
    fs.readFile(STYLES_PATH, 'utf-8'),
    fs.readFile(DATA_PATH, 'utf-8'),
  ]);

  const data = JSON.parse(rawData);
  const template = Handlebars.compile(templateSource);
  const html = template({ ...data, styles });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(HTML_OUT, html, 'utf-8');
  return html;
}

async function renderArtifacts(html) {
  const executablePath = resolveChromeExecutable();
  if (!executablePath) {
    throw new Error(
      'No Chrome/Chromium executable found. Set CHROME_PATH or PUPPETEER_EXECUTABLE_PATH.',
    );
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

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
  console.log('Compiling invoice template…');
  const html = await renderHtml();
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
