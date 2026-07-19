import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from './_layout';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();

  const [feeInput, setFeeInput] = useState(String(settings.platformFeePercent));
  const [shippingInput, setShippingInput] = useState(String(settings.shippingCost));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFeeInput(String(settings.platformFeePercent));
    setShippingInput(String(settings.shippingCost));
  }, [settings]);

  const handleSave = async () => {
    const fee = parseFloat(feeInput);
    const shipping = parseFloat(shippingInput);

    if (isNaN(fee) || fee < 0 || fee > 100) {
      Alert.alert('Invalid Fee', 'Platform fee must be between 0 and 100%.');
      return;
    }
    if (isNaN(shipping) || shipping < 0) {
      Alert.alert('Invalid Shipping', 'Shipping cost must be a positive number.');
      return;
    }

    await updateSettings({ platformFeePercent: fee, shippingCost: shipping });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const styles = makeStyles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your selling preferences</Text>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELLING FEES</Text>

          <View style={styles.card}>
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>Platform Fee</Text>
                <Text style={styles.fieldHint}>eBay ~12%, Amazon ~15%</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={feeInput}
                  onChangeText={setFeeInput}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.mutedForeground}
                  selectionColor={colors.primary}
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>Fixed Shipping Cost</Text>
                <Text style={styles.fieldHint}>Subtracted from profit</Text>
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  value={shippingInput}
                  onChangeText={setShippingInput}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.mutedForeground}
                  selectionColor={colors.primary}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sale Price</Text>
              <Text style={styles.infoValue}>AI Estimate × Condition</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>− Platform Fee</Text>
              <Text style={styles.infoValue}>Sale Price × Fee %</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>− Shipping</Text>
              <Text style={styles.infoValue}>Fixed Cost</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>− Purchase Price</Text>
              <Text style={styles.infoValue}>What you paid</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>= Net Profit</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>Your take-home</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saved && styles.saveButtonSuccess]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: TAB_BAR_HEIGHT + insets.bottom + 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    header: {
      paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
      paddingBottom: 24,
    },
    title: {
      fontSize: 30,
      fontFamily: 'Inter_700Bold',
      fontWeight: '800',
      color: colors.foreground,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: '#8a9aae',
      letterSpacing: 0.4,
    },
    section: { marginBottom: 24 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    field: { padding: 16 },
    fieldHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    fieldLabel: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    fieldHint: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      paddingVertical: 10,
    },
    inputPrefix: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      marginRight: 4,
    },
    inputSuffix: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      marginLeft: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 0,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
    },
    infoDivider: { height: 1, backgroundColor: colors.border },
    infoLabel: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    infoValue: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    saveButtonSuccess: {
      backgroundColor: '#00A87F',
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.primaryForeground,
    },
  });
}
