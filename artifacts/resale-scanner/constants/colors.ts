/**
 * ProfitSleuth — design tokens
 * Professional dark theme inspired by Robinhood / Coinbase
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#E8F0FE',
    tint: '#00D4AA',

    // Core surfaces
    background: '#0A1628',
    foreground: '#E8F0FE',

    // Cards / elevated surfaces
    card: '#142035',
    cardForeground: '#E8F0FE',

    // Primary action color (scan, analyze buttons)
    primary: '#00D4AA',
    primaryForeground: '#0A1628',

    // Secondary
    secondary: '#1E3A5F',
    secondaryForeground: '#B0C4DE',

    // Muted
    muted: '#1E3A5F',
    mutedForeground: '#6B8099',

    // Accent (price labels, highlights)
    accent: '#FFB347',
    accentForeground: '#0A1628',

    // Profit (green)
    profit: '#00D4AA',
    profitForeground: '#0A1628',

    // Loss (red)
    loss: '#FF5B5B',
    lossForeground: '#FFFFFF',

    // Destructive
    destructive: '#FF5B5B',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#1E3A5F',
    input: '#1E3A5F',

    // Tab bar
    tabBarBackground: '#0D1F36',
  },

  radius: 12,
};

export default colors;
export type Colors = typeof colors.light;
