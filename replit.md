# Resale Price Scanner

A mobile-first MVP app that uses AI to analyze item images and calculate resale profit. Scan any item with your camera, get an instant AI-powered market value estimate, and calculate your net profit after platform fees and shipping.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/resale-scanner run dev` — run the Expo mobile app (via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native + Expo (SDK 54), Expo Router v6
- API: Express 5
- AI: Google Gemini 2.5 Flash via Replit AI Integrations (`@workspace/integrations-gemini-ai`)
- Persistence: AsyncStorage (settings), no database needed
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where Things Live

- `artifacts/resale-scanner/` — Expo mobile app
  - `app/(tabs)/index.tsx` — Scanner screen (camera + gallery + AI analysis)
  - `app/(tabs)/calculator.tsx` — Profit calculator screen
  - `app/(tabs)/settings.tsx` — Settings screen (fee %, shipping cost)
  - `context/SettingsContext.tsx` — AsyncStorage-backed settings (platformFeePercent, shippingCost)
  - `context/ScanContext.tsx` — Shared state for AI analysis results across screens
  - `constants/colors.ts` — Dark navy design tokens (primary: #00D4AA teal-green)
- `artifacts/api-server/src/routes/analyze.ts` — POST /api/analyze route (Gemini Vision)
- `lib/integrations-gemini-ai/` — Gemini SDK client wrapper
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)

## Architecture Decisions

- **Server-side AI calls**: Gemini API calls happen on the backend (`/api/analyze`) to keep the API key secure and never exposed in the mobile bundle.
- **AsyncStorage for settings**: Platform fee % and shipping cost are persisted locally — no database needed for user preferences.
- **Context for scan state**: `ScanContext` shares the last AI analysis between Scanner and Calculator tabs without prop drilling.
- **Image compression**: `expo-image-picker` compresses to quality 0.7 before base64 encoding to stay under Gemini's 8MB inline data limit.
- **EAS Build ready**: `app.json` has `bundleIdentifier`, `package`, `versionCode`, and permission strings configured for both iOS and Android store submissions.

## Profit Formula

```
Adjusted Sale Price = Market High Estimate × Condition Multiplier
  - Fair:     70%
  - Good:     85%
  - Like New: 95%

Platform Fee = Adjusted Sale Price × (Fee% / 100)
Net Profit   = Adjusted Sale Price − Platform Fee − Shipping Cost − Purchase Price
ROI          = Net Profit / Purchase Price × 100
```

## User Preferences

- Dark navy theme (#0A1628 background, #00D4AA teal-green primary)
- No emojis in UI — icons only via @expo/vector-icons (Feather)
- Default platform fee: 15%, default shipping: $5.00

## Gotchas

- After any OpenAPI change: run `pnpm --filter @workspace/api-spec run codegen` before using updated hooks.
- The Gemini integration env vars (`AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`) are auto-provisioned — never modify them manually.
- `@google/genai` must remain a direct dependency of `@workspace/api-server` because esbuild externalizes `@google/*` packages.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile development patterns
- See the `ai-integrations-gemini` skill for Gemini API usage
