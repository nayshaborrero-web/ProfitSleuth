#!/usr/bin/env python3
"""
patch_html.py — Post-build HTML patcher for ProfitSleuth GitHub Pages deployment.

Bypasses Expo/React Native Web's layout engine by injecting a pure-CSS
three-column presentation dashboard directly into the compiled HTML.
Runs after `expo export --platform web` and `fix-base-path.js`.
"""

import os

DIST = os.path.join(os.path.dirname(__file__), '..', 'dist')


def patch_file(filepath):
    if not os.path.exists(filepath):
        print(f'  skipped (not found): {filepath}')
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # ── 1. Inject global CSS into <head> ────────────────────────────────────
    font_style = """
    <style>
        /* Force system sans-serif immediately; CDN Inter swaps in once loaded */
        * {
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
                         "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            box-sizing: border-box;
        }
        body, html {
            margin: 0; padding: 0;
            width: 100%; height: 100%;
            background-color: #030712;
            overflow: hidden;
        }

        /* ── Three-column dashboard ── */
        .dashboard-container {
            display: flex;
            flex-direction: row;
            width: 100vw;
            height: 100vh;
            align-items: center;
            justify-content: space-between;
            background-color: #030712;
            gap: 0;
        }
        .side-panel {
            width: 25%;
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 28px;
            height: 100%;
            overflow-y: auto;
        }
        .brand-mark {
            border-bottom: 1px solid #1E3A5F;
            padding-bottom: 16px;
            margin-bottom: 4px;
        }
        .brand-name {
            color: #00D4AA;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.3px;
            margin: 0 0 4px;
        }
        .brand-tagline {
            color: #4A6A8A;
            font-size: 11px;
            font-weight: 400;
            letter-spacing: 0.5px;
            margin: 0;
        }
        .panel-section { display: flex; flex-direction: column; gap: 10px; }
        .panel-section-label {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
        }
        .label-accent {
            width: 3px; height: 14px;
            border-radius: 2px;
            background: #00D4AA;
            flex-shrink: 0;
        }
        .panel-title {
            color: #00D4AA;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            margin: 0;
        }
        .panel-body {
            color: #8A9AAE;
            font-size: 13px;
            font-weight: 400;
            line-height: 1.6;
            margin: 0;
        }
        .stat-row {
            display: flex;
            flex-direction: row;
            gap: 8px;
        }
        .stat {
            flex: 1;
            background: #0D1F36;
            border-radius: 10px;
            border: 1px solid #1E3A5F;
            padding: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .stat-value {
            color: #E8F0FE;
            font-size: 18px;
            font-weight: 800;
            margin: 0;
        }
        .stat-label {
            color: #4A6A8A;
            font-size: 9px;
            font-weight: 500;
            text-align: center;
            letter-spacing: 0.4px;
            margin: 0;
        }
        .impact-badge {
            background: rgba(0, 212, 170, 0.08);
            border-radius: 12px;
            border: 1px solid rgba(0, 212, 170, 0.27);
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .impact-big {
            color: #00D4AA;
            font-size: 40px;
            font-weight: 800;
            line-height: 1;
            margin: 0 0 4px;
        }
        .impact-sub {
            color: #00D4AA;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.6px;
            margin: 0;
        }
        .chip-row { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; }
        .chip {
            background: #0D1F36;
            border-radius: 20px;
            border: 1px solid #1E3A5F;
            padding: 4px 10px;
            color: #6B8099;
            font-size: 11px;
            font-weight: 500;
        }

        /* ── Phone mockup frame ── */
        .phone-mockup-frame {
            width: 390px;
            height: 844px;
            background-color: #0A1628;
            border-radius: 40px;
            border: 8px solid #1e293b;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(0, 212, 170, 0.06);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            position: relative;
            flex-shrink: 0;
        }
        .phone-speaker {
            width: 56px;
            height: 5px;
            border-radius: 3px;
            background: #1E3A5F;
            align-self: center;
            margin: 10px auto 4px;
            flex-shrink: 0;
        }
        .phone-screen {
            flex: 1;
            position: relative;
            overflow: hidden;
        }

        /* Force the React Native root to fill the phone screen */
        #root, #main, [data-reactroot] {
            width: 100% !important;
            height: 100% !important;
            background: transparent !important;
            position: absolute !important;
            inset: 0 !important;
        }

        /* Hide the specific header and body text inside the app frame that duplicates your side panel text */
        .phone-screen [data-reactroot] h1, 
        .phone-screen [data-reactroot] p {
            /* If you know the specific class names for these duplicated sections, replace these selectors */
            display: none !important;
        }

        /* Hide on mobile / narrow viewports — show plain SPA instead */
        @media (max-width: 959px) {
            .dashboard-container { display: none; }
            .mobile-fallback { display: flex !important; }
        }
        @media (min-width: 960px) {
            .mobile-fallback { display: none !important; }
        }
    </style>
    """
    if '<style data-patch-dashboard>' not in html:
        # Tag the injected block so we don't double-inject on re-runs
        font_style = font_style.replace('<style>', '<style data-patch-dashboard>', 1)
        html = html.replace('</head>', f'{font_style}\n</head>')

    # ── 2. Re-structure <body> ───────────────────────────────────────────────
    left_panel = '''
    <div class="dashboard-container" id="dashboard">
        <div class="side-panel">
            <div class="brand-mark">
                <p class="brand-name">ProfitSleuth</p>
                <p class="brand-tagline">Resale Intelligence &middot; Powered by Gemini</p>
            </div>

            <div class="panel-section">
                <div class="panel-section-label">
                    <div class="label-accent"></div>
                    <p class="panel-title">The Story</p>
                </div>
                <p class="panel-body">I live near liquidation and return stores. Sourcing was a massive headache&mdash;standing in aisles manually typing titles into different web browsers while trying to guess shipping fees and calculate platform cuts. Sourcing felt like data entry instead of a fun side hustle.</p>
            </div>

            <div class="panel-section">
                <div class="panel-section-label">
                    <div class="label-accent"></div>
                    <p class="panel-title">The Manual Bottleneck</p>
                </div>
                <p class="panel-body">Manual lookups slow buying speed to a crawl, causing you to get overwhelmed or completely miss out on high-profit items in store bins.</p>
            </div>

            <div class="stat-row">
                <div class="stat"><p class="stat-value">3+</p><p class="stat-label">Marketplaces checked</p></div>
                <div class="stat"><p class="stat-value">~8min</p><p class="stat-label">Manual lookup time</p></div>
                <div class="stat"><p class="stat-value">30s</p><p class="stat-label">With ProfitSleuth</p></div>
            </div>
        </div>

        <div class="phone-mockup-frame">
            <div class="phone-speaker"></div>
            <div class="phone-screen">
    '''

    right_panel = '''
            </div><!-- /.phone-screen -->
        </div><!-- /.phone-mockup-frame -->

        <div class="side-panel">
            <div class="panel-section">
                <div class="panel-section-label">
                    <div class="label-accent"></div>
                    <p class="panel-title">The Solution</p>
                </div>
                <p class="panel-body">A clean 30-second workflow. Snapshot an item to instantly fetch e-commerce database values, calculate dynamic net margins (fees/shipping), and auto-generate AI product listings, titles, and SEO tags.</p>
            </div>

            <div class="panel-section">
                <div class="panel-section-label">
                    <div class="label-accent"></div>
                    <p class="panel-title">The Impact</p>
                </div>
                <div class="impact-badge">
                    <p class="impact-big">10&times;</p>
                    <p class="impact-sub">Sourcing Velocity</p>
                </div>
                <p class="panel-body">Moving from high-risk blind guesswork to data-backed acquisition decisions right on the spot&mdash;lowering the barrier to entry for building a reselling side income.</p>
            </div>

            <div class="panel-section">
                <div class="panel-section-label">
                    <div class="label-accent"></div>
                    <p class="panel-title">Tech Stack</p>
                </div>
                <div class="chip-row">
                    <span class="chip">Gemini Vision</span>
                    <span class="chip">Expo Router</span>
                    <span class="chip">React Native</span>
                    <span class="chip">GitHub Pages</span>
                    <span class="chip">Node API</span>
                </div>
            </div>
        </div>
    </div><!-- /.dashboard-container -->

    <!-- Mobile fallback: plain SPA, no dashboard chrome -->
    <div class="mobile-fallback" style="display:none;width:100vw;height:100vh;background:#0A1628;">
    '''

    mobile_fallback_close = '</div><!-- /.mobile-fallback -->'

    if '<body>' in html and 'dashboard-container' not in html:
        html = html.replace('<body>', f'<body>{left_panel}')
        html = html.replace('</body>', f'{right_panel}{mobile_fallback_close}\n</body>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'  patched: {os.path.relpath(filepath)}')


if __name__ == '__main__':
    print('\nPatching HTML with presentation dashboard...')
    patch_file(os.path.join(DIST, 'index.html'))
    patch_file(os.path.join(DIST, '404.html'))
    print('Successfully forced transparent container, presentation text sidebars, and modern font overrides!')
