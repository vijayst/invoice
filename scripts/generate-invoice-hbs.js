#!/usr/bin/env node
import { existsSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, '..');

const TEMPLATE_PATH = path.join(WORKSPACE_DIR, 'src/templates/invoice.hbs');
const DATA_PATH = path.join(WORKSPACE_DIR, 'src/data/invoice-input.json');
const OUTPUT_DIR = path.join(WORKSPACE_DIR, 'output');
const HTML_OUT = path.join(OUTPUT_DIR, 'invoice-hbs.html');
const PDF_OUT = path.join(OUTPUT_DIR, 'invoice-hbs.pdf');
const PREVIEW_OUT = path.join(OUTPUT_DIR, 'preview-hbs.png');

function chromeCandidates() {
  const home = os.homedir();
  return [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
}

function resolveBrowserLaunchOptions() {
  for (const candidate of chromeCandidates()) {
    if (existsSync(candidate)) {
      return { executablePath: candidate };
    }
  }
  return { channel: 'chrome' };
}

async function renderHtml() {
  const [templateSource, rawData] = await Promise.all([
    fs.readFile(TEMPLATE_PATH, 'utf-8'),
    fs.readFile(DATA_PATH, 'utf-8'),
  ]);

  const data = JSON.parse(rawData);
  const html = Handlebars.compile(templateSource)(data);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
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
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.emulateMediaType('screen');

    const styled = await page
      .waitForFunction(() => {
        const probe = document.querySelector('[data-tailwind-probe]');
        if (!probe) return false;
        const color = getComputedStyle(probe).backgroundColor;
        return color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent';
      }, { timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (!styled) {
      throw new Error(
        'Tailwind styles did not apply. Check network access to https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
      );
    }

    await page.pdf({
      path: PDF_OUT,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
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
  console.log('Compiling invoice.hbs…');
  const html = await renderHtml();
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, HTML_OUT)}`);

  console.log('Loading Tailwind from CDN and rendering PDF…');
  await renderArtifacts(html);
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, PDF_OUT)}`);
  console.log(`Wrote ${path.relative(WORKSPACE_DIR, PREVIEW_OUT)}`);
  console.log('Done');
}

main().catch((error) => {
  console.error('generate-invoice-hbs failed:', error);
  process.exit(1);
});
