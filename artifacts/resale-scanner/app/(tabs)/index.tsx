import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAnalyzeItemImage } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useScan, type AnalysisResult } from '@/context/ScanContext';

const CONDITION_MULTIPLIER: Record<string, number> = {
  fair: 0.7,
  good: 0.85,
  like_new: 0.95,
};

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAnalysis, setScannedImageUri } = useScan();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  // ~10 MB of base64 ≈ 7.5 MB raw — stays safely under the 20 MB server
  // limit and Gemini's 8 MB inline-data limit.
  const MAX_BASE64_BYTES = 10_000_000;

  const analyzemutation = useAnalyzeItemImage({
    mutation: {
      onSuccess: (data) => {
        setResult(data as AnalysisResult);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        Alert.alert('Analysis Failed', 'Could not analyze the image. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const pickImage = async (useCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
      exif: false,
    };

    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan items.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to select images.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const b64 = asset.base64 ?? null;

    // Clear previous state
    setResult(null);
    setSizeError(null);

    // Check size before accepting the image
    if (b64 && b64.length > MAX_BASE64_BYTES) {
      const sizeMB = (b64.length / 1_000_000).toFixed(1);
      setSizeError(
        `This image is too large (${sizeMB} MB encoded). Please use an image under 7.5 MB — try cropping it, lowering your camera resolution, or picking a smaller photo.`
      );
      setImageUri(asset.uri);   // still show the preview so the user can see which image
      setImageBase64(null);     // but block analysis
      return;
    }

    setImageUri(asset.uri);
    setImageBase64(b64);

    const mime = asset.mimeType ?? 'image/jpeg';
    setImageMime(mime);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAnalyze = () => {
    if (!imageBase64) return;
    analyzemutation.mutate({
      data: { imageBase64, mimeType: imageMime },
    });
  };

  const handleUseForCalculation = () => {
    if (!result || !imageUri) return;
    setAnalysis(result);
    setScannedImageUri(imageUri);
    router.push('/(tabs)/calculator');
  };

  const styles = makeStyles(colors, insets);

  const confidenceColor =
    result?.confidenceLevel === 'high'
      ? colors.profit
      : result?.confidenceLevel === 'medium'
      ? colors.accent
      : colors.loss;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Resale Scanner</Text>
        <Text style={styles.subtitle}>Scan any item to get its market value</Text>
      </View>

      {/* Image Preview Area */}
      <TouchableOpacity
        style={styles.imageArea}
        onPress={() => pickImage(false)}
        activeOpacity={0.85}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderContent}>
            <View style={styles.iconCircle}>
              <Feather name="camera" size={36} color={colors.primary} />
            </View>
            <Text style={styles.placeholderTitle}>Scan an Item</Text>
            <Text style={styles.placeholderSub}>Tap to select a photo or use the buttons below</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cameraButton]}
          onPress={() => pickImage(true)}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={18} color={colors.primaryForeground} />
          <Text style={styles.actionButtonText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.galleryButton]}
          onPress={() => pickImage(false)}
          activeOpacity={0.8}
        >
          <Feather name="image" size={18} color={colors.foreground} />
          <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Size Error Disclaimer */}
      {sizeError && (
        <View style={styles.sizeErrorCard}>
          <Feather name="alert-triangle" size={18} color={styles.sizeErrorTitle.color} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.sizeErrorTitle}>Image Too Large</Text>
            <Text style={styles.sizeErrorBody}>{sizeError}</Text>
            <Text style={styles.sizeErrorHint}>
              Accepted: up to 7.5 MB · JPEG or PNG · Tip: use the crop tool or reduce camera resolution.
            </Text>
          </View>
        </View>
      )}

      {/* Analyze Button */}
      {imageUri && !result && !sizeError && (
        <TouchableOpacity
          style={[styles.analyzeButton, analyzemutation.isPending && styles.analyzeButtonLoading]}
          onPress={handleAnalyze}
          disabled={analyzemutation.isPending}
          activeOpacity={0.8}
        >
          {analyzemutation.isPending ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={styles.analyzeButtonText}>Analyzing...</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Feather name="zap" size={18} color={colors.primaryForeground} />
              <Text style={styles.analyzeButtonText}>Analyze Item</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Results Card */}
      {result && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <View style={styles.resultsTitleRow}>
              <Text style={styles.resultsItemName}>{result.itemName}</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '22', borderColor: confidenceColor }]}>
                <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                  {result.confidenceLevel.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.resultsCategory}>{result.category}</Text>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceSectionLabel}>ESTIMATED MARKET VALUE</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>
                ${result.estimatedLow} – ${result.estimatedHigh}
              </Text>
            </View>
          </View>

          <Text style={styles.resultsDescription}>{result.description}</Text>

          {result.suggestedPlatforms.length > 0 && (
            <View style={styles.platformsSection}>
              <Text style={styles.platformsLabel}>BEST PLATFORMS</Text>
              <View style={styles.platformsRow}>
                {result.suggestedPlatforms.slice(0, 4).map((platform) => (
                  <View key={platform} style={styles.platformChip}>
                    <Text style={styles.platformChipText}>{platform}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => { setResult(null); setImageUri(null); }}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
              <Text style={styles.rescanButtonText}>New Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleUseForCalculation}
              activeOpacity={0.8}
            >
              <Feather name="trending-up" size={15} color={colors.primaryForeground} />
              <Text style={styles.calculateButtonText}>Calculate Profit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    header: {
      paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
      paddingBottom: 20,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    imageArea: {
      height: 240,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      overflow: 'hidden',
      marginBottom: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewImage: { width: '100%', height: '100%' },
    placeholderContent: { alignItems: 'center', gap: 12 },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    placeholderSub: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: colors.radius,
    },
    cameraButton: { backgroundColor: colors.primary },
    galleryButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primaryForeground,
    },
    sizeErrorCard: {
      backgroundColor: '#2A1010',
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.loss + '88',
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
      alignItems: 'flex-start',
    },
    sizeErrorTitle: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.loss,
    },
    sizeErrorBody: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: '#FFAAAA',
      lineHeight: 18,
    },
    sizeErrorHint: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      lineHeight: 16,
    },
    analyzeButton: {
      backgroundColor: colors.accent,
      borderRadius: colors.radius,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    analyzeButtonLoading: { opacity: 0.7 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    analyzeButtonText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: '#0A1628',
    },
    resultsCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 16,
      marginBottom: 16,
    },
    resultsHeader: { gap: 4 },
    resultsTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    resultsItemName: {
      flex: 1,
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    confidenceBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    confidenceText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
    resultsCategory: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    priceSection: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      padding: 14,
      gap: 4,
    },
    priceSectionLabel: {
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 1,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline' },
    priceValue: {
      fontSize: 32,
      fontFamily: 'Inter_700Bold',
      color: colors.accent,
    },
    resultsDescription: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      lineHeight: 19,
    },
    platformsSection: { gap: 8 },
    platformsLabel: {
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 1,
    },
    platformsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    platformChip: {
      backgroundColor: colors.secondary,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    platformChipText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    resultActions: { flexDirection: 'row', gap: 10 },
    rescanButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: colors.radius,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rescanButtonText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
    },
    calculateButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
    },
    calculateButtonText: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: colors.primaryForeground,
    },
  });
}
