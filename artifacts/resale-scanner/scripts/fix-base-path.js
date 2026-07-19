#!/usr/bin/env node
/**
 * Post-export path patcher for GitHub Pages.
 *
 * Expo's Metro bundler emits root-relative asset paths (/_expo/..., /favicon.ico)
 * regardless of web.baseUrl in app.json. When the site is served from a sub-path
 * (e.g. /ProfitSleuth/), those paths 404. This script:
 *  1. Rewrites asset paths in every HTML file in dist/
 *  2. Injects Inter from Google Fonts CDN so fonts load before the JS bundle
 *  3. Copies index.html → 404.html so GitHub Pages SPA hard-refreshes don't 404
 */

const fs = require('fs');
const path = require('path');

const BASE = '/ProfitSleuth';
const DIST = path.join(__dirname, '..', 'dist');

const FONT_INJECT = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" data-inter-font="1" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
  '<style>',
  '  body,#root{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
  '  body{background:#0A1628;margin:0;}',
  '</style>',
].join('\n');

function patch(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // <script src="/_expo/…" → /ProfitSleuth/_expo/…
  html = html.replace(/(<script\b[^>]*\ssrc=")(\/_expo\/)/g, `$1${BASE}/_expo/`);

  // <link href="/_expo/…"
  html = html.replace(/(<link\b[^>]*\shref=")(\/_expo\/)/g, `$1${BASE}/_expo/`);

  // favicon
  html = html.replace(/(<link\b[^>]*\shref=")(\/favicon\.ico")/g, `$1${BASE}/favicon.ico"`);

  // Inject Google Fonts + body background before </head>
  if (!html.includes('data-inter-font')) {
    html = html.replace('</head>', `${FONT_INJECT}\n</head>`);
  }

  fs.writeFileSync(filePath, html);
  console.log('  patched:', path.relative(DIST, filePath));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) patch(full);
  }
}

console.log(`\nPatching base path → ${BASE}`);
walk(DIST);

// Copy index.html → 404.html so that GitHub Pages hard-refreshes on any
// sub-route (e.g. /ProfitSleuth/calculator) load the SPA shell instead of
// returning a real 404. The SPA router then picks up the path and renders
// the correct screen.
const indexHtml = path.join(DIST, 'index.html');
const notFoundHtml = path.join(DIST, '404.html');
fs.copyFileSync(indexHtml, notFoundHtml);
console.log('  created: 404.html (SPA redirect shell)');

console.log('\nDone.');
