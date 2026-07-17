import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// expo-blur works on both platforms
import { BlurView } from 'expo-blur';

// iOS-only native modules — require() inside Platform guards so Android
// never tries to resolve them and the module doesn't crash on load.
const isIOS = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

let SymbolView: React.ComponentType<{ name: string; tintColor?: string; size?: number }> | null =
  null;
let isLiquidGlassAvailable: () => boolean = () => false;
let NativeTabs: any = null;
let NativeTabsIcon: any = null;
let NativeTabsLabel: any = null;

if (isIOS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SymbolView = require('expo-symbols').SymbolView;
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    isLiquidGlassAvailable = require('expo-glass-effect').isLiquidGlassAvailable;
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nativeTabs = require('expo-router/unstable-native-tabs');
    NativeTabs = nativeTabs.NativeTabs;
    NativeTabsIcon = nativeTabs.Icon;
    NativeTabsLabel = nativeTabs.Label;
  } catch {}
}

export const TAB_BAR_HEIGHT = 60;

function NativeTabLayout() {
  if (!NativeTabs || !NativeTabsIcon || !NativeTabsLabel) return null;
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabsIcon sf={{ default: 'camera.viewfinder', selected: 'camera.viewfinder' }} />
        <NativeTabsLabel>Scanner</NativeTabsLabel>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calculator">
        <NativeTabsIcon
          sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis.fill' }}
        />
        <NativeTabsLabel>Calculator</NativeTabsLabel>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabsIcon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <NativeTabsLabel>Settings</NativeTabsLabel>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  // On Android the tab bar sits at position:absolute, so we must manually
  // size it to include the system navigation-bar inset at the bottom.
  const tabBarHeight = isWeb ? 84 : TAB_BAR_HEIGHT + insets.bottom;
  const tabBarPaddingBottom = isWeb ? 34 : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'dark'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarBackground }]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color }) =>
            isIOS && SymbolView ? (
              <SymbolView name="camera.viewfinder" tintColor={color} size={24} />
            ) : (
              <Feather name="camera" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculator',
          tabBarIcon: ({ color }) =>
            isIOS && SymbolView ? (
              <SymbolView name="chart.line.uptrend.xyaxis" tintColor={color} size={24} />
            ) : (
              <Feather name="trending-up" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) =>
            isIOS && SymbolView ? (
              <SymbolView name="gearshape" tintColor={color} size={24} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  // NativeTabLayout is only for iOS Liquid Glass (iOS 26+).
  // On Android and web always use ClassicTabLayout.
  if (isIOS && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
