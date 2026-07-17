import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { Camera, CheckCircle2, ChevronRight, Settings, Slash, TrendingDown, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { useScan } from '@/context/ScanContext';

type Condition = 'poor' | 'fair' | 'good' | 'like_new' | 'free';

const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  free: 0,
  poor: 0.5,
  fair: 0.7,
  good: 0.85,
  like_new: 0.95,
};

const CONDITION_LABELS: Record<Condition, string> = {
  free: 'Free',
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  like_new: 'Like New',
};

const CONDITION_HINTS: Record<Condition, string> = {
  free: 'Not for resale',
  poor: '50% of market',
  fair: '70% of market',
  good: '85% of market',
  like_new: '95% of market',
};

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { analysis, scannedImageUri } = useScan();

  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [condition, setCondition] = useState<Condition>('good');
  const [itemNameInput, setItemNameInput] = useState('');

  useEffect(() => {
    if (analysis) {
      setItemNameInput(analysis.itemName);
      const c = analysis.condition as Condition;
      if (c && c in CONDITION_MULTIPLIERS) {
        setCondition(c);
      }
    }
  }, [analysis]);

  const purchasePrice = parseFloat(purchasePriceInput) || 0;
  const marketHigh = analysis ? analysis.estimatedHigh : 0;
  const marketLow = analysis ? analysis.estimatedLow : 0;

  const { salePrice, platformFee, shippingCost, netProfit, roi } = useMemo(() => {
    const multiplier = CONDITION_MULTIPLIERS[condition];
    const salePrice = marketHigh * multiplier;
    const platformFee = salePrice * (settings.platformFeePercent / 100);
    const shippingCost = settings.shippingCost;
    const netProfit = salePrice - platformFee - shippingCost - purchasePrice;
    const roi = purchasePrice > 0 ? (netProfit / purchasePrice) * 100 : 0;
    return { salePrice, platformFee, shippingCost, netProfit, roi };
  }, [condition, marketHigh, purchasePrice, settings]);

  const isProfitable = netProfit > 0;
  const profitColor = isProfitable ? colors.profit : colors.loss;

  const handleConditionSelect = async (c: Condition) => {
    setCondition(c);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profit Calculator</Text>
          <Text style={styles.subtitle}>Real-time profit breakdown</Text>
        </View>

        {/* Item Source */}
        {analysis ? (
          <View style={styles.analysisSourceCard}>
            <View style={styles.analysisSourceLeft}>
              <CheckCircle2 size={16} color={colors.profit} />
              <View style={{ flex: 1 }}>
                <Text style={styles.analysisSourceTitle} numberOfLines={1}>
                  {analysis.itemName}
                </Text>
                <Text style={styles.analysisSourceSub}>
                  Market: ${marketLow}–${marketHigh}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/')}
              style={styles.rescanLink}
            >
              <Text style={styles.rescanLinkText}>Rescan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.scanPromptCard}
            onPress={() => router.push('/(tabs)/')}
            activeOpacity={0.8}
          >
            <Camera size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scanPromptTitle}>Scan an item first</Text>
              <Text style={styles.scanPromptSub}>Tap to go to the scanner</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Inputs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INPUTS</Text>
          <View style={styles.card}>
            {/* Purchase Price */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Purchase Price</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  value={purchasePriceInput}
                  onChangeText={setPurchasePriceInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Condition */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Item Condition</Text>
              {/* Top row: Poor / Fair / Good / Like New */}
              <View style={styles.conditionRow}>
                {(['poor', 'fair', 'good', 'like_new'] as Condition[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.conditionChip,
                      condition === c && styles.conditionChipActive,
                    ]}
                    onPress={() => handleConditionSelect(c)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        condition === c && styles.conditionChipTextActive,
                      ]}
                    >
                      {CONDITION_LABELS[c]}
                    </Text>
                    <Text
                      style={[
                        styles.conditionHint,
                        condition === c && styles.conditionHintActive,
                      ]}
                    >
                      {CONDITION_HINTS[c]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Free — full-width warning chip */}
              <TouchableOpacity
                style={[
                  styles.freeChip,
                  condition === 'free' && styles.freeChipActive,
                ]}
                onPress={() => handleConditionSelect('free')}
                activeOpacity={0.8}
              >
                <Text style={[styles.freeChipText, condition === 'free' && styles.freeChipTextActive]}>
                  Free / Not for Resale
                </Text>
                <Text style={[styles.freeChipHint, condition === 'free' && styles.freeChipHintActive]}>
                  Item has no resale value
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Breakdown Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROFIT BREAKDOWN</Text>
          <View style={styles.card}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Estimated Sale Price</Text>
              <Text style={styles.breakdownValue}>${salePrice.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                − Platform Fee ({settings.platformFeePercent}%)
              </Text>
              <Text style={[styles.breakdownValue, { color: colors.loss }]}>
                −${platformFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>− Shipping Cost</Text>
              <Text style={[styles.breakdownValue, { color: colors.loss }]}>
                −${shippingCost.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>− Purchase Price</Text>
              <Text style={[styles.breakdownValue, { color: colors.loss }]}>
                −${purchasePrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Profit Display */}
        {condition === 'free' ? (
          <View style={styles.noResaleCard}>
            <Slash size={28} color={colors.loss} />
            <Text style={styles.noResaleTitle}>Not Suitable for Resale</Text>
            <Text style={styles.noResaleBody}>
              This item is in too poor a condition to generate a meaningful return. Consider donating it or disposing of it responsibly.
            </Text>
          </View>
        ) : (
          <View style={[styles.profitCard, { borderColor: profitColor + '44' }]}>
            <View style={styles.profitHeader}>
              {isProfitable
                ? <TrendingUp size={20} color={profitColor} />
                : <TrendingDown size={20} color={profitColor} />}
              <Text style={[styles.profitLabel, { color: profitColor }]}>
                {isProfitable ? 'NET PROFIT' : 'NET LOSS'}
              </Text>
            </View>
            <Text style={[styles.profitValue, { color: profitColor }]}>
              {isProfitable ? '+' : ''}${netProfit.toFixed(2)}
            </Text>
            {purchasePrice > 0 && (
              <View style={styles.roiRow}>
                <Text style={styles.roiLabel}>ROI</Text>
                <Text style={[styles.roiValue, { color: profitColor }]}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                </Text>
              </View>
            )}
            {!analysis && (
              <Text style={styles.profitNote}>
                Scan an item above to get AI-powered price estimates
              </Text>
            )}
          </View>
        )}

        {/* Settings Reminder */}
        <TouchableOpacity
          style={styles.settingsHint}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <Settings size={14} color={colors.mutedForeground} />
          <Text style={styles.settingsHintText}>
            Fee: {settings.platformFeePercent}% · Shipping: ${settings.shippingCost.toFixed(2)} — Tap to adjust
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
      paddingBottom: 20,
    },
    title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 4 },
    subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    analysisSourceCard: {
      backgroundColor: colors.profit + '18',
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.profit + '44',
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
    },
    analysisSourceLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    analysisSourceTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    analysisSourceSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    rescanLink: { paddingVertical: 4, paddingHorizontal: 8 },
    rescanLinkText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.primary },
    scanPromptCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
    },
    scanPromptTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    scanPromptSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    section: { marginBottom: 16 },
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
    fieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.mutedForeground, marginBottom: 10 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    inputPrefix: { fontSize: 22, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground, marginRight: 4 },
    input: {
      flex: 1,
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      paddingVertical: 10,
    },
    divider: { height: 1, backgroundColor: colors.border },
    conditionRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    conditionChip: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    conditionChipActive: {
      backgroundColor: colors.primary + '22',
      borderColor: colors.primary,
    },
    conditionChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground },
    conditionChipTextActive: { color: colors.primary },
    conditionHint: { fontSize: 9, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 2 },
    conditionHintActive: { color: colors.primary },
    freeChip: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    freeChipActive: {
      backgroundColor: colors.loss + '18',
      borderColor: colors.loss,
    },
    freeChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground },
    freeChipTextActive: { color: colors.loss },
    freeChipHint: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    freeChipHintActive: { color: colors.loss },
    noResaleCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 2,
      borderColor: colors.loss + '44',
      padding: 24,
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    noResaleTitle: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: colors.loss,
      textAlign: 'center',
    },
    noResaleBody: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 19,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
    },
    breakdownDivider: { height: 1, backgroundColor: colors.border },
    breakdownLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    breakdownValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    profitCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 2,
      padding: 20,
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    profitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    profitLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5 },
    profitValue: { fontSize: 48, fontFamily: 'Inter_700Bold' },
    roiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    roiLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
    roiValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    profitNote: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    settingsHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
    },
    settingsHintText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.mutedForeground },
  });
}
