import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { SettingsProvider } from '@/context/SettingsContext';
import { ScanProvider } from '@/context/ScanContext';

// Set the API base URL from the injected env var
setBaseUrl('https://51f26822-7c32-4d66-aadc-70883fcb9f13-00-2mii7y4iqeng4.worf.replit.dev');

SplashScreen.preventAutoHideAsync();

// ─── Web global styles (injected before first render) ─────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Inter via Google Fonts CDN — locally-bundled font files 404 on GitHub Pages
  // under the /ProfitSleuth/ sub-path, so CDN is the reliable delivery path.
  if (!document.querySelector('link[data-inter-font]')) {
    (['https://fonts.googleapis.com', 'https://fonts.gstatic.com'] as const).forEach(
      (href, i) => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        if (i === 1) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      },
    );
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.setAttribute('data-inter-font', '1');
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(fontLink);
  }

  // Global overrides: system → Inter font stack, dark bg, scrollbar theming.
  // Using system sans-serif as the initial fallback means text renders
  // immediately while the CDN Inter stylesheet is still loading.
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      background: #030712;
      margin: 0;
      font-family: "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
    }
    body, #root { width: 100%; height: 100%; }
    textarea::-webkit-scrollbar { width: 6px; }
    textarea::-webkit-scrollbar-track { background: #142035; border-radius: 3px; }
    textarea::-webkit-scrollbar-thumb { background: #1E3A5F; border-radius: 3px; }
    textarea::-webkit-scrollbar-thumb:hover { background: #00D4AA; }
  `;
  document.head.appendChild(style);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();
const IS_WEB = Platform.OS === 'web';
const DESKTOP_BREAKPOINT = 960;

// Exact iPhone 14 Pro dimensions for the center phone mockup
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

// ─── Presentation panel helpers ───────────────────────────────────────────────

// System-first font stack so text renders immediately on web even before
// Inter is registered by useFonts; CDN Inter takes over once the CSS loads.
const FONT_BODY = Platform.OS === 'web'
  ? 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif'
  : 'Inter_400Regular';
const FONT_MEDIUM = Platform.OS === 'web'
  ? 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif'
  : 'Inter_500Medium';
const FONT_BOLD = Platform.OS === 'web'
  ? 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif'
  : 'Inter_700Bold';

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={ps.section}>
      <View style={ps.sectionLabel}>
        <View style={ps.labelAccent} />
        <Text style={ps.labelText}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function LeftPanel() {
  return (
    <View style={ps.sidePanel}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ps.panelInner}>
        <View style={ps.brandMark}>
          <Text style={ps.brandName}>ProfitSleuth</Text>
          <Text style={ps.brandTagline}>Resale Intelligence · Powered by Gemini</Text>
        </View>

        <PanelSection title="THE STORY">
          <Text style={ps.body}>
            I live near liquidation and return stores. Sourcing was a headache — standing in aisles
            typing titles manually into different browsers while guessing fees and shipping. It felt
            like data entry instead of a fun side hustle, so I built ProfitSleuth to automate the
            pricing math.
          </Text>
        </PanelSection>

        <PanelSection title="THE MANUAL BOTTLENECK">
          <Text style={ps.body}>
            Looking up market values manually across marketplaces slows buying speed to a crawl,
            causing you to get overwhelmed — or completely miss out on high-profit items in store bins.
          </Text>
        </PanelSection>

        <View style={ps.statRow}>
          {[
            { v: '3+', l: 'Marketplaces\nchecked' },
            { v: '~8min', l: 'Manual\nlookup time' },
            { v: '30s', l: 'With\nProfitSleuth' },
          ].map(({ v, l }) => (
            <View key={v} style={ps.stat}>
              <Text style={ps.statValue}>{v}</Text>
              <Text style={ps.statLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function RightPanel() {
  return (
    <View style={ps.sidePanel}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ps.panelInner}>
        <PanelSection title="THE SOLUTION">
          <Text style={ps.body}>
            A clean 30-second workflow. Snapshot an item to instantly fetch e-commerce database
            values, calculate dynamic net margins (fees/shipping), and auto-generate AI product
            listings, titles, and SEO tags.
          </Text>
        </PanelSection>

        <PanelSection title="THE IMPACT">
          <View style={ps.impactBadge}>
            <Text style={ps.impactBig}>10×</Text>
            <Text style={ps.impactSub}>Sourcing Velocity</Text>
          </View>
          <Text style={ps.body}>
            Moving from high-risk blind guesswork to data-backed acquisition decisions right on the
            spot — lowering the barrier to entry for building a reselling side income.
          </Text>
        </PanelSection>

        <PanelSection title="TECH STACK">
          <View style={ps.chipRow}>
            {['Gemini Vision', 'Expo Router', 'React Native', 'GitHub Pages', 'Node API'].map((t) => (
              <View key={t} style={ps.chip}>
                <Text style={ps.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        </PanelSection>
      </ScrollView>
    </View>
  );
}

// ─── Desktop 3-column presentation layout ────────────────────────────────────
function DesktopPresentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, width: '100%' }}>
      {children}
    </View>
  );
}

// Stylesheet for the presentation layout (desktop web only)
const ps = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#030712',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 24,
    overflow: 'hidden' as any,
  },
  sidePanel: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    alignSelf: 'stretch',
  },
  panelInner: {
    gap: 28,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandMark: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 22,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#00D4AA',
  },
  brandTagline: {
    fontSize: 11,
    fontFamily: FONT_BODY,
    color: '#4A6A8A',
    letterSpacing: 0.5,
  },
  section: { gap: 10 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: '#00D4AA' },
  labelText: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#00D4AA',
    letterSpacing: 1.4,
  },
  body: {
    fontSize: 13,
    fontFamily: FONT_BODY,
    color: '#8A9AAE',
    lineHeight: 20,
  },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stat: {
    flex: 1,
    backgroundColor: '#0D1F36',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#E8F0FE',
  },
  statLabel: {
    fontSize: 9,
    fontFamily: FONT_MEDIUM,
    color: '#4A6A8A',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  impactBadge: {
    backgroundColor: '#00D4AA18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D4AA44',
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  impactBig: {
    fontSize: 40,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#00D4AA',
  },
  impactSub: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#00D4AA',
    letterSpacing: 0.6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#0D1F36',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontFamily: FONT_MEDIUM, color: '#6B8099' },

  // ── Phone mockup shell ──
  phoneShell: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    flexShrink: 0,
    backgroundColor: '#0A1628',
    borderRadius: 36,
    borderWidth: 8,
    borderColor: '#1e293b',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  phoneSpeaker: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1E3A5F',
    marginTop: 10,
    marginBottom: 4,
  },
  phoneScreen: {
    flex: 1,
    overflow: 'hidden',
  },
});

// ─── Root layout nav ──────────────────────────────────────────────────────────

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = IS_WEB && windowWidth >= DESKTOP_BREAKPOINT;

  // Load custom font assets. On native this is the only font delivery path.
  // On web, the CDN <link> above already loaded Inter, so useFonts is a
  // belt-and-suspenders registration — we do NOT block render waiting for it.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide splash once fonts are ready (or have errored).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // ── Route fix for GitHub Pages sub-path deployment ──
  // On first mount, check if expo-router ended up on the +not-found screen
  // because it couldn't reconcile /ProfitSleuth/ against the base URL.
  // If so, force a replace to the root screen so the app loads correctly.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const base = '/ProfitSleuth';
    const raw = window.location.pathname;
    // Strip the base prefix to get the in-app path
    const inAppPath = raw.startsWith(base) ? raw.slice(base.length) || '/' : raw;

    // If we're at the root (with or without trailing slash) and the document
    // has already rendered the +not-found page, push the router to '/'
    // so the tab layout mounts correctly.
    if (inAppPath === '/' || inAppPath === '') {
      // Small delay to let expo-router finish its initial hydration pass
      const t = setTimeout(() => {
        try {
          router.replace('/');
        } catch {
          // router may not be ready yet on very first paint — ignore
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, []);

  // On native, block render until fonts are loaded (no CDN fallback).
  // On web, render immediately — CDN Inter + system font CSS is already
  // applied, so there is no fallback flash.
  if (!IS_WEB && !fontsLoaded && !fontError) return null;

  const nav = <RootLayoutNav />;

  let content: React.ReactNode;

  if (!IS_WEB) {
    // Native: bare navigator, no wrapper
    content = nav;
  } else if (isDesktop) {
    // Desktop web (≥ 960 px): full 3-column presentation dashboard
    content = <DesktopPresentationLayout>{nav}</DesktopPresentationLayout>;
  } else {
    // Mobile web: centred phone-width column
    content = (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          backgroundColor: '#0A1628',
          width: '100vw' as any,
          height: '100vh' as any,
        }}
      >
        <View style={{ flex: 1, width: '100%', maxWidth: PHONE_WIDTH }}>{nav}</View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A1628' }}>
            <KeyboardProvider>
              <SettingsProvider>
                <ScanProvider>{content}</ScanProvider>
              </SettingsProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
