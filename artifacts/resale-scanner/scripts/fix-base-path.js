#!/usr/bin/env node
/**
 * fix-base-path.js — Post-build path rewriter for GitHub Pages.
 *
 * GitHub Pages serves the site at /ProfitSleuth/. Expo's static export
 * emits root-relative asset paths (/_expo/..., /favicon.ico). This script:
 *   1. Rewrites those paths in every HTML file under dist/ to /ProfitSleuth/...
 *   2. Injects an Inter CDN <link> into <head> for fast font loading.
 *   3. Copies dist/index.html → dist/404.html so GitHub Pages 404s route
 *      back into the SPA instead of showing a real 404 page.
 */

const fs   = require('fs');
const path = require('path');

const BASE   = '/ProfitSleuth';
const DIST   = path.join(__dirname, '..', 'dist');

const INTER_CDN = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />`;

function patchHtml(filepath) {
  let html = fs.readFileSync(filepath, 'utf8');

  // Rewrite /_expo/... → /ProfitSleuth/_expo/...
  html = html.replace(/(src|href)="\/_expo\//g,  `$1="${BASE}/_expo/`);
  html = html.replace(/(src|href)="\/favicon/g,  `$1="${BASE}/favicon`);

  // Inject Inter CDN before </head>
  if (!html.includes('fonts.googleapis.com')) {
    html = html.replace('</head>', `${INTER_CDN}\n</head>`);
  }

  fs.writeFileSync(filepath, html, 'utf8');
}

console.log(`\nPatching base path → ${BASE}`);

// Walk dist/ and patch every .html file
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.html')) {
      patchHtml(full);
      console.log(`  patched: ${path.relative(DIST, full)}`);
    }
  }
}

walk(DIST);

// Create 404.html as a copy of index.html for SPA deep-link support
const src  = path.join(DIST, 'index.html');
const dest = path.join(DIST, '404.html');
fs.copyFileSync(src, dest);
console.log('  created: 404.html (SPA redirect shell)');
console.log('\nDone.');
