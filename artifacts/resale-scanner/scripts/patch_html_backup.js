#!/usr/bin/env node
/**
 * patch_html.js — Non-destructive overlay patcher for ProfitSleuth GitHub Pages deployment.
 *
 * Strategy: never touch the HTML structure.
 *   1. Inject a <style> block into <head> that turns #root into the phone mockup via CSS.
 *   2. Append two position:fixed floating panels + the style block right before </body>.
 *
 * Expo's #root, all script tags, and the entire generated DOM stay 100% untouched.
 */

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const INJECT = `
<style data-patch-dashboard>
  * {
    font-family: system-ui, -apple-system, BlinkMacSystemFont,
                 "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  }

  body, html {
    background-color: #030712 !important;
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    overflow: hidden;
  }

  /* ── Turn #root into the centred phone mockup ── */
  #root, #main, body > div[data-reactroot] {
    width: 390px !important;
    height: 844px !important;
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    background-color: #0A1628 !important;
    border-radius: 40px !important;
    border: 6px solid #1e293b !important;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.75),
                0 0 0 1px rgba(0,212,170,0.06) !important;
    overflow: hidden !important;
    z-index: 5 !important;
  }

  /* ── Floating side panels ── */
  .presentation-panel {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 300px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    z-index: 10;
  }
  .panel-left  { left:  calc(50% - 195px - 332px); }
  .panel-right { right: calc(50% - 195px - 332px); }

  .brand-name    { color: #00D4AA; font-size: 17px; font-weight: 800; margin: 0 0 3px; letter-spacing: 0.3px; }
  .brand-tagline { color: #4A6A8A; font-size: 10px; margin: 0; letter-spacing: 0.5px; }
  .brand-mark    { border-bottom: 1px solid #1E3A5F; padding-bottom: 14px; }

  .p-section { display: flex; flex-direction: column; gap: 7px; }
  .p-label   { display: flex; align-items: center; gap: 7px; }
  .p-accent  { width: 3px; height: 13px; border-radius: 2px; background: #00D4AA; flex-shrink: 0; }
  .p-title   { color: #22d3ee; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; margin: 0; }
  .p-body    { color: #94a3b8; font-size: 13px; line-height: 1.65; margin: 0; }

  .stat-row { display: flex; gap: 8px; }
  .stat {
    flex: 1; background: #0D1F36; border-radius: 10px;
    border: 1px solid #1E3A5F; padding: 10px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
  }
  .stat-v { color: #E8F0FE; font-size: 17px; font-weight: 800; margin: 0; }
  .stat-l { color: #4A6A8A; font-size: 9px; font-weight: 500; text-align: center; letter-spacing: 0.4px; margin: 0; }

  .impact-badge {
    background: rgba(0,212,170,0.08); border-radius: 12px;
    border: 1px solid rgba(0,212,170,0.27); padding: 14px;
    display: flex; flex-direction: column; align-items: center;
  }
  .impact-big { color: #00D4AA; font-size: 36px; font-weight: 800; line-height: 1; margin: 0 0 3px; }
  .impact-sub { color: #00D4AA; font-size: 11px; font-weight: 500; letter-spacing: 0.6px; margin: 0; }

  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    background: #0D1F36; border-radius: 20px; border: 1px solid #1E3A5F;
    padding: 4px 10px; color: #6B8099; font-size: 11px; font-weight: 500;
  }
  .chip:hover { background: #1E3A5F; }

  @media (max-width: 959px) {
  /* Change the parent container to a vertical column */
  .main-wrapper { 
    display: flex !important;
    flex-direction: column !important;
  }

  /* Ensure the panels come first, then the app */
  .presentation-panel {
    display: flex !important;
    order: 1; /* These will stack at the top */
  }

  .phone-shell {
    order: 2; /* This will be forced below the panels */
    width: 100vw;
    border: none;
  }

  /* ── Responsive: collapse to plain full-screen app on narrow viewports ── */
  @media (max-width: 1100px) {
    .presentation-panel { display: none !important; }
    #root, #main, body > div[data-reactroot] {
      width: 100vw !important; height: 100vh !important;
      border: none !important; border-radius: 0 !important;
      box-shadow: none !important;
      left: 0 !important; top: 0 !important;
      transform: none !important;
    }
  }
</style>

<!-- LEFT floating panel — sits outside Expo's DOM entirely -->
<div class="presentation-panel panel-left">
  <div class="brand-mark">
    <p class="brand-name">ProfitSleuth</p>
    <p class="brand-tagline">Resale Intelligence &middot; Powered by Gemini</p>
  </div>

  <div class="p-section">
    <div class="p-label"><div class="p-accent"></div><p class="p-title">The Story</p></div>
    <p class="p-body">I live near liquidation and return stores. Sourcing was a massive headache&mdash;standing in aisles manually typing titles into different browsers while trying to guess shipping fees and calculate platform cuts. It felt like data entry, not a hustle.</p>
  </div>

  <div class="p-section">
    <div class="p-label"><div class="p-accent"></div><p class="p-title">The Bottleneck</p></div>
    <p class="p-body">Manual lookups slow buying speed to a crawl, causing missed high-profit items in store bins.</p>
  </div>

  <div class="stat-row">
    <div class="stat"><p class="stat-v">3+</p><p class="stat-l">Marketplaces checked</p></div>
    <div class="stat"><p class="stat-v">~8m</p><p class="stat-l">Manual lookup</p></div>
    <div class="stat"><p class="stat-v">30s</p><p class="stat-l">With ProfitSleuth</p></div>
  </div>
</div>

<!-- RIGHT floating panel — sits outside Expo's DOM entirely -->
<div class="presentation-panel panel-right">
  <div class="p-section">
    <div class="p-label"><div class="p-accent"></div><p class="p-title">The Solution</p></div>
    <p class="p-body">A clean 30-second workflow. Snapshot an item to instantly fetch real market values, calculate dynamic net margins (fees&thinsp;/&thinsp;shipping), and auto-generate AI product listings and SEO tags.</p>
  </div>

  <div class="p-section">
    <div class="p-label"><div class="p-accent"></div><p class="p-title">The Impact</p></div>
    <div class="impact-badge">
      <p class="impact-big">10&times;</p>
      <p class="impact-sub">Sourcing Velocity</p>
    </div>
    <p class="p-body">From blind guesswork to data-backed acquisition decisions on the spot&mdash;lowering the barrier to building a reselling side income.</p>
  </div>

  <div class="p-section">
    <div class="p-label"><div class="p-accent"></div><p class="p-title">Tech Stack</p></div>
    <div class="chip-row">
      <span class="chip">Gemini Vision</span>
      <span class="chip">Expo Router</span>
      <span class="chip">React Native</span>
      <span class="chip">GitHub Pages</span>
      <span class="chip">Node API</span>
    </div>
  </div>
</div>
`;

function patchFile(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`  skipped (not found): ${path.relative(process.cwd(), filepath)}`);
    return;
  }

  let html = fs.readFileSync(filepath, 'utf8');

  // Idempotency guard
  if (html.includes('data-patch-dashboard')) {
    console.log(`  already patched: ${path.relative(process.cwd(), filepath)}`);
    return;
  }

  // Single safe injection point: right before </body>
  // Expo's entire DOM — #root, script tags, everything — stays completely untouched.
  html = html.replace('</body>', `${INJECT}\n</body>`);

  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`  patched: ${path.relative(process.cwd(), filepath)}`);
}

console.log('\nApplying non-destructive overlay patch...');
patchFile(path.join(DIST, 'index.html'));
patchFile(path.join(DIST, '404.html'));
console.log('Done.\n');
