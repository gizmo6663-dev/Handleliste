/**
 * Lager Android-launcher-ikonene fra samme handlekurv-tegning som PWA-en bruker.
 * Kjøres bare når ikonet endres: `npm run icons:android`.
 *
 * Rasteriseringen skjer med Chromium. Sett CHROME_BIN om binærfila ligger annet sted.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(root, 'android', 'app', 'src', 'main', 'res');

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const bases = ['/opt/pw-browsers', join(process.env.HOME ?? '', '.cache', 'ms-playwright')];
  for (const base of bases) {
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

/** Selve kurven, tegnet i et 64×64-rutenett. */
const BASKET = `
  <path d="M17 21h30l-2.6 24.2A4 4 0 0 1 40.4 49H23.6a4 4 0 0 1-4-3.8L17 21z"
        fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M25 22.5v-4a7 7 0 0 1 14 0v4"
        fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M25.5 34.5l4.6 4.6L39.5 30"
        fill="none" stroke="#9fe3bf" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>`;

const GRADIENT = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f8a5c"/>
      <stop offset="1" stop-color="#1d6042"/>
    </linearGradient>
  </defs>`;

/** Fullt ikon med bakgrunn: avrundet firkant eller sirkel. */
function solid(shape) {
  const backdrop =
    shape === 'round'
      ? '<circle cx="32" cy="32" r="32" fill="url(#bg)"/>'
      : '<rect width="64" height="64" rx="14" fill="url(#bg)"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${GRADIENT}${backdrop}${BASKET}</svg>`;
}

/**
 * Forgrunnen til adaptive ikoner. Systemet beskjærer kraftig, så motivet
 * skaleres ned til den trygge midtsonen og bakgrunnen er gjennomsiktig.
 */
function foreground() {
  const scale = 0.62;
  const offset = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g transform="translate(${offset} ${offset}) scale(${scale})">${BASKET}</g>
  </svg>`;
}

const DENSITIES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

const chrome = findChrome();

function render(svg, size, outFile, transparent) {
  const work = join(tmpdir(), `icon-${Math.random().toString(36).slice(2)}`);
  mkdirSync(work, { recursive: true });
  const page = join(work, 'icon.html');
  writeFileSync(
    page,
    `<!doctype html><meta charset="utf-8"><style>
       html,body{margin:0;padding:0;background:${transparent ? 'transparent' : '#1d6042'}}
       svg{display:block;width:${size}px;height:${size}px}
     </style>${svg}`,
  );

  const args = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--screenshot=${join(work, 'out.png')}`,
    `--window-size=${size},${size}`,
  ];
  if (transparent) args.push('--default-background-color=00000000');
  args.push(`file://${page}`);

  execFileSync(chrome, args, { stdio: 'ignore' });
  mkdirSync(dirname(outFile), { recursive: true });
  renameSync(join(work, 'out.png'), outFile);
  rmSync(work, { recursive: true, force: true });
}

for (const [density, launcher, adaptive] of DENSITIES) {
  const dir = join(res, `mipmap-${density}`);
  render(solid('square'), launcher, join(dir, 'ic_launcher.png'), false);
  render(solid('round'), launcher, join(dir, 'ic_launcher_round.png'), true);
  render(foreground(), adaptive, join(dir, 'ic_launcher_foreground.png'), true);
  console.log(`✓ mipmap-${density} (${launcher}px / ${adaptive}px)`);
}
