#!/usr/bin/env node
/**
 * patch_html.js — Non-destructive overlay patcher for ProfitSleuth GitHub Pages deployment.
 *
 * Strategy: inject CSS + HTML right before </body>. Expo's #root and all script
 * tags are never touched. CSS shapes #root into the phone mockup on desktop,
 * and reverts it to full-screen on mobile where the info panels stack above it.
 */

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const INJECT = `
<style data-patch-dashboard>
  /* ── Reset & base ── */
  * {
    font-family: system-ui, -apple-system, BlinkMacSystemFont,
                 "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    box-sizing: border-box;
  }
  body, html {
    margin: 0; padding: 0;
    background-color: #0B1120 !important;
  }

  /* ──────────────────────────────────────────
     DESKTOP  (> 1100 px)
     #root becomes the centred phone mockup.
     Side panels float fixed on each side.
  ────────────────────────────────────────── */
  @media (min-width: 1101px) {
    html, body { width: 100%; height: 100%; overflow: hidden; }

    /* Phone mockup */
    #root, #main, body > div[data-reactroot] {
      width: 390px !important;
      height: 844px !important;
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      transform: translate(-50%, -50%) !important;
      background-color: #111A28 !important;
      border-radius: 40px !important;
      border: 6px solid #1e293b !important;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.75),
                  0 0 0 1px rgba(0,221,179,0.07) !important;
      overflow: hidden !important;
      z-index: 5 !important;
    }

    /* Floating panels */
    .pf-panel {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: 22px;
      z-index: 10;
    }
    .pf-left  { left:  calc(50% - 195px - 330px); }
    .pf-right { right: calc(50% - 195px - 330px); }

    /* Mobile panels hidden on desktop */
    .pm-panels { display: none !important; }
  }

  /* ──────────────────────────────────────────
     MOBILE / TABLET  (≤ 1100 px)
     Panels stack at top; app fills screen below.
  ────────────────────────────────────────── */
  @media (max-width: 1100px) {
    html, body { width: 100%; height: auto; overflow-y: auto; }

    /* Desktop floating panels hidden */
    .pf-panel { display: none !important; }

    /* Stacked mobile panels */
    .pm-panels {
      display: flex !important;
      flex-direction: column;
      gap: 0;
      width: 100%;
      background: #0B1120;
      padding: 28px 20px 20px;
    }
    .pm-row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 16px;
    }
    .pm-col {
      flex: 1;
      min-width: 260px;
    }

    /* App fills full screen below the panels */
    #root, #main, body > div[data-reactroot] {
      position: relative !important;
      top: auto !important; left: auto !important;
      transform: none !important;
      width: 100vw !important;
      height: 100vh !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background-color: #0B1120 !important;
      overflow: hidden !important;
      z-index: 5 !important;
    }
  }

  /* ── Shared panel typography & components ── */
  .pf-brand-mark, .pm-brand-mark {
    border-bottom: 1px solid #1E3A5F;
    padding-bottom: 12px;
    margin-bottom: 4px;
  }
  .pf-brand-name, .pm-brand-name {
    color: #00DDB3; font-size: 17px; font-weight: 800;
    letter-spacing: 0.3px; margin: 0 0 3px;
  }
  .pf-brand-tag, .pm-brand-tag {
    color: #4A6A8A; font-size: 10px; margin: 0; letter-spacing: 0.5px;
  }

  .pf-section, .pm-section { display: flex; flex-direction: column; gap: 7px; }
  .pf-lbl, .pm-lbl { display: flex; align-items: center; gap: 7px; }
  .pf-accent, .pm-accent {
    width: 3px; height: 12px; border-radius: 2px;
    background: #00DDB3; flex-shrink: 0;
  }
  .pf-title, .pm-title {
    color: #00DDB3; font-size: 10px; font-weight: 800;
    letter-spacing: 1.4px; text-transform: uppercase; margin: 0;
  }
  .pf-body, .pm-body {
    color: #94a3b8; font-size: 13px; line-height: 1.65; margin: 0;
  }

  .pf-stat-row, .pm-stat-row { display: flex; gap: 7px; }
  .pf-stat, .pm-stat {
    flex: 1; background: #0D1F36; border-radius: 10px;
    border: 1px solid #1E3A5F; padding: 10px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
  }
  .pf-sv, .pm-sv { color: #E8F0FE; font-size: 16px; font-weight: 800; margin: 0; }
  .pf-sl, .pm-sl {
    color: #4A6A8A; font-size: 9px; font-weight: 500;
    text-align: center; letter-spacing: 0.3px; margin: 0;
  }

  .pf-impact, .pm-impact {
    background: rgba(0,221,179,0.08);
    border-radius: 12px; border: 1px solid rgba(0,221,179,0.27);
    padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 3px;
  }
  .pf-ibig, .pm-ibig {
    color: #00DDB3; font-size: 34px; font-weight: 800; line-height: 1; margin: 0 0 3px;
  }
  .pf-isub, .pm-isub {
    color: #00DDB3; font-size: 11px; font-weight: 500; letter-spacing: 0.6px; margin: 0;
  }

  .pf-chips, .pm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .pf-chip, .pm-chip {
    background: #0D1F36; border-radius: 20px; border: 1px solid #1E3A5F;
    padding: 4px 10px; color: #6B8099; font-size: 11px; font-weight: 500;
  }

  /* ── LinkedIn attribution — bottom-left, always visible ── */
  .pf-attribution {
    position: fixed;
    bottom: 16px;
    left: 20px;
    z-index: 20;
    font-size: 12px;
  }
  .pf-attribution a {
    color: #00DDB3 !important;
    text-decoration: none !important;
    font-weight: bold !important;
  }
  .pf-attribution a:hover { text-decoration: underline !important; }
</style>

<!-- ════════════════════════════════════════
     DESKTOP: fixed floating panels (hidden on mobile via CSS)
════════════════════════════════════════ -->
<div class="pf-panel pf-left">
  <div class="pf-brand-mark">
    <p class="pf-brand-name">ProfitSleuth</p>
    <p class="pf-brand-tag">Resale Intelligence &middot; Powered by Gemini</p>
  </div>
  <div class="pf-section">
    <div class="pf-lbl"><div class="pf-accent"></div><p class="pf-title">The Story</p></div>
    <p class="pf-body">I live near liquidation and return stores. Sourcing was a massive headache&mdash;standing in aisles manually typing titles into different browsers, guessing shipping fees, and calculating platform cuts. It felt like data entry instead of a hustle.</p>
  </div>
  <div class="pf-section">
    <div class="pf-lbl"><div class="pf-accent"></div><p class="pf-title">The Bottleneck</p></div>
    <p class="pf-body">Manual lookups slow buying speed to a crawl, causing missed high-profit items in store bins.</p>
  </div>
  <div class="pf-stat-row">
    <div class="pf-stat"><p class="pf-sv">3+</p><p class="pf-sl">Marketplaces checked</p></div>
    <div class="pf-stat"><p class="pf-sv">~8m</p><p class="pf-sl">Manual lookup</p></div>
    <div class="pf-stat"><p class="pf-sv">30s</p><p class="pf-sl">With ProfitSleuth</p></div>
  </div>
</div>

<div class="pf-panel pf-right">
  <div class="pf-section">
    <div class="pf-lbl"><div class="pf-accent"></div><p class="pf-title">The Solution</p></div>
    <p class="pf-body">A clean 30-second workflow. Snapshot an item to instantly fetch real market values, calculate dynamic net margins (fees&thinsp;/&thinsp;shipping), and auto-generate AI product listings and SEO tags.</p>
  </div>
  <div class="pf-section">
    <div class="pf-lbl"><div class="pf-accent"></div><p class="pf-title">The Impact</p></div>
    <div class="pf-impact">
      <p class="pf-ibig">10&times;</p>
      <p class="pf-isub">Sourcing Velocity</p>
    </div>
    <p class="pf-body">From blind guesswork to data-backed acquisition decisions on the spot&mdash;lowering the barrier to building a reselling side income.</p>
  </div>
  <div class="pf-section">
    <div class="pf-lbl"><div class="pf-accent"></div><p class="pf-title">Tech Stack</p></div>
    <div class="pf-chips">
      <span class="pf-chip">Gemini Vision</span>
      <span class="pf-chip">Expo Router</span>
      <span class="pf-chip">React Native</span>
      <span class="pf-chip">GitHub Pages</span>
      <span class="pf-chip">Node API</span>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════
     MOBILE: stacked panels above the app (hidden on desktop via CSS)
════════════════════════════════════════ -->
<div class="pm-panels">
  <div class="pm-brand-mark" style="margin-bottom:20px;">
    <p class="pm-brand-name">ProfitSleuth</p>
    <p class="pm-brand-tag">Resale Intelligence &middot; Powered by Gemini</p>
  </div>
  <div class="pm-row">
    <div class="pm-col">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="pm-section">
          <div class="pm-lbl"><div class="pm-accent"></div><p class="pm-title">The Story</p></div>
          <p class="pm-body">Standing in liquidation aisles manually typing titles into different browsers, guessing fees, calculating cuts. It felt like data entry instead of a hustle.</p>
        </div>
        <div class="pm-section">
          <div class="pm-lbl"><div class="pm-accent"></div><p class="pm-title">The Bottleneck</p></div>
          <p class="pm-body">Manual lookups slow buying speed, causing missed high-profit items in store bins.</p>
        </div>
        <div class="pm-stat-row">
          <div class="pm-stat"><p class="pm-sv">3+</p><p class="pm-sl">Marketplaces</p></div>
          <div class="pm-stat"><p class="pm-sv">~8m</p><p class="pm-sl">Manual lookup</p></div>
          <div class="pm-stat"><p class="pm-sv">30s</p><p class="pm-sl">ProfitSleuth</p></div>
        </div>
      </div>
    </div>
    <div class="pm-col">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="pm-section">
          <div class="pm-lbl"><div class="pm-accent"></div><p class="pm-title">The Solution</p></div>
          <p class="pm-body">Snapshot an item to instantly fetch real market values, calculate net margins, and auto-generate AI listings and SEO tags.</p>
        </div>
        <div class="pm-section">
          <div class="pm-lbl"><div class="pm-accent"></div><p class="pm-title">The Impact</p></div>
          <div class="pm-impact">
            <p class="pm-ibig">10&times;</p>
            <p class="pm-isub">Sourcing Velocity</p>
          </div>
        </div>
        <div class="pm-section">
          <div class="pm-lbl"><div class="pm-accent"></div><p class="pm-title">Tech Stack</p></div>
          <div class="pm-chips">
            <span class="pm-chip">Gemini Vision</span>
            <span class="pm-chip">Expo Router</span>
            <span class="pm-chip">React Native</span>
            <span class="pm-chip">GitHub Pages</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <p style="color:#4A6A8A;font-size:11px;margin:20px 0 0;text-align:center;letter-spacing:0.4px;">
    ↓ Live app below &mdash; scroll down to use it
  </p>
</div>

<!-- ════════════════════════════════════════
     LinkedIn attribution — bottom-left corner
════════════════════════════════════════ -->
<div class="pf-attribution">
  <a href="https://www.linkedin.com/in/naysha-borrero/" target="_blank" rel="noopener noreferrer">
    Built by Naysha Borrero ↗
  </a>
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

  // Single safe injection point: right before </body>.
  // Expo's entire DOM — #root, script tags, everything — stays completely untouched.
  html = html.replace('</body>', `${INJECT}\n</body>`);

  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`  patched: ${path.relative(process.cwd(), filepath)}`);
}

console.log('\nApplying non-destructive overlay patch...');
patchFile(path.join(DIST, 'index.html'));
patchFile(path.join(DIST, '404.html'));
console.log('Done.\n');
