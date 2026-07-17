import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { TAB_BAR_HEIGHT } from './_layout';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  Camera,
  Clipboard as ClipboardIcon,
  Copy,
  ImageIcon,
  Pencil,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
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
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameOverride, setNameOverride] = useState('');

  // ~10 MB of base64 ≈ 7.5 MB raw — stays safely under the 20 MB server
  // limit and Gemini's 8 MB inline-data limit.
  const MAX_BASE64_BYTES = 10_000_000;

  // Sync editable template fields whenever a new result arrives
  useEffect(() => {
    if (result?.listingTemplate) {
      setDraftTitle(result.listingTemplate.title ?? '');
      setDraftBody(result.listingTemplate.body ?? '');
    }
  }, [result]);

  const analyzemutation = useAnalyzeItemImage({
    mutation: {
      onSuccess: (data) => {
        setResult(data as AnalysisResult);
        setEditingName(false);
        setNameOverride('');
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

    // On Android, allowsEditing+base64 is a known Expo bug where the cropper
    // discards the base64 field. Fall back to reading the URI with FileSystem.
    let b64 = asset.base64 ?? null;
    if (!b64 && asset.uri && Platform.OS !== 'web') {
      try {
        b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // FileSystem fallback failed — b64 stays null
      }
    }

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

  // Shared: validate size and apply an image from any source
  const applyBase64Image = (b64: string, mime: string) => {
    setResult(null);
    setSizeError(null);

    if (b64.length > MAX_BASE64_BYTES) {
      const sizeMB = (b64.length / 1_000_000).toFixed(1);
      setSizeError(
        `This image is too large (${sizeMB} MB encoded). Please use an image under 7.5 MB — try cropping it, lowering your camera resolution, or picking a smaller photo.`
      );
      setImageUri(null);
      setImageBase64(null);
      return;
    }

    setImageUri(`data:${mime};base64,${b64}`);
    setImageBase64(b64);
    setImageMime(mime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pasteFromClipboard = async () => {
    if (Platform.OS === 'web') {
      // Web: expo-clipboard doesn't support images — use the browser Clipboard API directly
      try {
        const cb = (navigator as any).clipboard;
        if (typeof cb?.read !== 'function') {
          Alert.alert(
            'Not Supported',
            'Your browser does not support clipboard image reading. Use Camera or Gallery instead.'
          );
          return;
        }

        const items: ClipboardItem[] = await cb.read();
        let b64: string | null = null;
        let mime = 'image/png';

        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              b64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              mime = type;
              break;
            }
          }
          if (b64) break;
        }

        if (!b64) {
          Alert.alert('No Image on Clipboard', 'Copy an image first, then tap Paste to scan it.');
          return;
        }

        applyBase64Image(b64, mime);
      } catch {
        Alert.alert(
          'Clipboard Access Denied',
          'Allow clipboard access in your browser (look for the clipboard icon in the address bar), then try again.'
        );
      }
    } else {
      // Native: use expo-clipboard
      const hasImage = await Clipboard.hasImageAsync();
      if (!hasImage) {
        Alert.alert('No Image on Clipboard', 'Copy an image first, then tap Paste to scan it.');
        return;
      }
      const clipResult = await Clipboard.getImageAsync({ format: 'jpeg' });
      if (!clipResult?.data) {
        Alert.alert('Paste Failed', 'Could not read the image from clipboard. Try again.');
        return;
      }
      applyBase64Image(clipResult.data, 'image/jpeg');
    }
  };

  const handleAnalyze = (hint?: string) => {
    if (!imageBase64) return;
    analyzemutation.mutate({
      data: {
        imageBase64,
        mimeType: imageMime,
        ...(hint ? { itemNameHint: hint } : {}),
      },
    });
  };

  const handleReanalyze = () => {
    const hint = nameOverride.trim();
    if (!hint) return;
    handleAnalyze(hint);
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
        <Text style={styles.title}>ProfitSleuth</Text>
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
              <Camera size={36} color={colors.primary} />
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
          <Camera size={18} color={colors.primaryForeground} />
          <Text style={styles.actionButtonText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.galleryButton]}
          onPress={() => pickImage(false)}
          activeOpacity={0.8}
        >
          <ImageIcon size={18} color={colors.foreground} />
          <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Paste from Clipboard */}
      <TouchableOpacity
        style={styles.pasteButton}
        onPress={pasteFromClipboard}
        activeOpacity={0.8}
      >
        <ClipboardIcon size={15} color={colors.mutedForeground} />
        <Text style={styles.pasteButtonText}>Paste from Clipboard</Text>
      </TouchableOpacity>

      {/* Size Error Disclaimer */}
      {sizeError && (
        <View style={styles.sizeErrorCard}>
          <AlertTriangle size={18} color={styles.sizeErrorTitle.color} />
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
          onPress={() => handleAnalyze()}
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
              <Zap size={18} color={colors.primaryForeground} />
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
              <Text style={styles.resultsItemName} numberOfLines={2}>{result.itemName}</Text>
              <View style={styles.resultsTitleActions}>
                <TouchableOpacity
                  style={styles.editNameButton}
                  onPress={() => { setNameOverride(result.itemName); setEditingName(true); }}
                  activeOpacity={0.7}
                >
                  <Pencil size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '22', borderColor: confidenceColor }]}>
                  <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                    {result.confidenceLevel.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.resultsCategory}>{result.category}</Text>

            {/* Inline name correction */}
            {editingName && (
              <View style={styles.reanalyzeSection}>
                <Text style={styles.reanalyzeSectionLabel}>Correct the item name</Text>
                <TextInput
                  style={styles.nameOverrideInput}
                  value={nameOverride}
                  onChangeText={setNameOverride}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleReanalyze}
                  placeholder="e.g. Nike Air Max 90 White UK9"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.reanalyzeActions}>
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={() => setEditingName(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reanalyzeButton, (!nameOverride.trim() || analyzemutation.isPending) && { opacity: 0.5 }]}
                    onPress={handleReanalyze}
                    disabled={!nameOverride.trim() || analyzemutation.isPending}
                    activeOpacity={0.8}
                  >
                    {analyzemutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <RefreshCw size={14} color={colors.primaryForeground} />
                    )}
                    <Text style={styles.reanalyzeButtonText}>
                      {analyzemutation.isPending ? 'Re-analyzing…' : 'Re-analyze'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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

          {result.listingTags?.length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsHeader}>
                <Text style={styles.tagsLabel}>LISTING TAGS</Text>
                <TouchableOpacity
                  style={styles.copyTagsButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(result.listingTags.join(', '));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('Copied', 'All tags copied to clipboard.');
                  }}
                  activeOpacity={0.7}
                >
                  <Copy size={12} color={colors.primary} />
                  <Text style={styles.copyTagsText}>Copy all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tagsRow}>
                {result.listingTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagChip}
                    onPress={async () => {
                      await Clipboard.setStringAsync(tag);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.tagsTip}>Tap a tag to copy it individually</Text>
            </View>
          )}

          {result.listingTemplate && (
            <View style={styles.templateSection}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateLabel}>LISTING TEMPLATE</Text>
                <TouchableOpacity
                  style={styles.copyTagsButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(`${draftTitle}\n\n${draftBody}`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('Copied', 'Full listing copied to clipboard.');
                  }}
                  activeOpacity={0.7}
                >
                  <Copy size={12} color={colors.primary} />
                  <Text style={styles.copyTagsText}>Copy full</Text>
                </TouchableOpacity>
              </View>

              {/* Editable title */}
              <View style={styles.templateFieldBlock}>
                <View style={styles.templateFieldRow}>
                  <Text style={styles.templateFieldLabel}>Title</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(draftTitle);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Copy size={13} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.templateTitleInput}
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  multiline={false}
                  returnKeyType="done"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={styles.templateCharCount}>{draftTitle.length} chars</Text>
              </View>

              {/* Editable body */}
              <View style={styles.templateFieldBlock}>
                <View style={styles.templateFieldRow}>
                  <Text style={styles.templateFieldLabel}>Description</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(draftBody);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Copy size={13} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.templateBodyInput}
                  value={draftBody}
                  onChangeText={setDraftBody}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <Text style={styles.tagsTip}>Tap any field to edit before copying</Text>
            </View>
          )}

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => { setResult(null); setImageUri(null); }}
              activeOpacity={0.8}
            >
              <RefreshCw size={15} color={colors.mutedForeground} />
              <Text style={styles.rescanButtonText}>New Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleUseForCalculation}
              activeOpacity={0.8}
            >
              <TrendingUp size={15} color={colors.primaryForeground} />
              <Text style={styles.calculateButtonText}>Calculate Profit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: TAB_BAR_HEIGHT + insets.bottom + 16 }} />
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
    resultsTitleActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    editNameButton: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reanalyzeSection: {
      marginTop: 12,
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    reanalyzeSectionLabel: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
    },
    nameOverrideInput: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    reanalyzeActions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelEditButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelEditText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
    },
    reanalyzeButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    reanalyzeButtonText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primaryForeground,
    },
    templateSection: {
      marginTop: 16,
      gap: 10,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    templateLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 0.8,
    },
    templateFieldBlock: {
      gap: 6,
    },
    templateFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    templateFieldLabel: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
    },
    templateTitleInput: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    templateCharCount: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'right',
    },
    templateBodyInput: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
      minHeight: 180,
      lineHeight: 20,
    },
    tagsSection: {
      marginTop: 16,
      gap: 8,
    },
    tagsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tagsLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      letterSpacing: 0.8,
    },
    copyTagsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '44',
    },
    copyTagsText: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primary,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tagChip: {
      backgroundColor: colors.secondary,
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 11,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagChipText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    tagsTip: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginTop: 2,
    },
    pasteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 11,
      borderRadius: colors.radius,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    pasteButtonText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
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
