/**
 * Lager PNG-ikonene til manifestet fra samme SVG-tegning.
 * Kjøres sjelden — bare når ikonet endres: `npm run icons`.
 *
 * Rasteriseringen skjer med Chromium, som allerede finnes i miljøet.
 * Sett CHROME_BIN hvis binærfila ligger et annet sted.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const candidates = [
    '/opt/pw-browsers',
    join(process.env.HOME ?? '', '.cache', 'ms-playwright'),
  ];
  for (const base of candidates) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      const candidate = join(base, entry, 'chrome-linux', 'chrome');
      if (existsSync(candidate)) return candidate;
    }
  }
  for (const candidate of ['/usr/bin/chromium', '/usr/bin/google-chrome']) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('Fant ingen Chromium. Sett CHROME_BIN.');
}

/** @param {{padding: number, radius: number}} options */
function drawing({ padding, radius }) {
  const inner = 64 - padding * 2;
  const scale = inner / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f8a5c"/>
      <stop offset="1" stop-color="#1d6042"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="#1d6042"/>
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <rect width="64" height="64" rx="${radius}" fill="url(#bg)"/>
    <path d="M17 21h30l-2.6 24.2A4 4 0 0 1 40.4 49H23.6a4 4 0 0 1-4-3.8L17 21z"
          fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M25 22.5v-4a7 7 0 0 1 14 0v4"
          fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M25.5 34.5l4.6 4.6L39.5 30"
          fill="none" stroke="#9fe3bf" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, padding: 0, radius: 15 },
  { file: 'icon-512.png', size: 512, padding: 0, radius: 15 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0, radius: 0 },
  // Maskable trenger luft: systemet kan beskjære inntil ytre 10 % på hver side.
  { file: 'icon-maskable-512.png', size: 512, padding: 8, radius: 12 },
];

const chrome = findChrome();
mkdirSync(outDir, { recursive: true });

for (const target of TARGETS) {
  const work = join(tmpdir(), `icon-${target.file}`);
  mkdirSync(work, { recursive: true });
  const page = join(work, 'icon.html');
  writeFileSync(
    page,
    `<!doctype html><meta charset="utf-8"><style>
       html,body{margin:0;padding:0;background:#1d6042}
       svg{display:block;width:${target.size}px;height:${target.size}px}
     </style>${drawing(target)}`,
  );

  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--screenshot=${join(work, 'out.png')}`,
      `--window-size=${target.size},${target.size}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  );

  renameSync(join(work, 'out.png'), join(outDir, target.file));
  rmSync(work, { recursive: true, force: true });
  console.log(`✓ ${target.file} (${target.size}px)`);
}
