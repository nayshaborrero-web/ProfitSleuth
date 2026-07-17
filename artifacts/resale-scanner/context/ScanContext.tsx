import React, { createContext, useCallback, useContext, useState } from 'react';

export interface AnalysisResult {
  itemName: string;
  category: string;
  estimatedLow: number;
  estimatedHigh: number;
  description: string;
  confidenceLevel: string;
  suggestedPlatforms: string[];
}

interface ScanContextValue {
  analysis: AnalysisResult | null;
  setAnalysis: (result: AnalysisResult | null) => void;
  scannedImageUri: string | null;
  setScannedImageUri: (uri: string | null) => void;
}

const ScanContext = createContext<ScanContextValue>({
  analysis: null,
  setAnalysis: () => {},
  scannedImageUri: null,
  setScannedImageUri: () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [analysis, setAnalysisState] = useState<AnalysisResult | null>(null);
  const [scannedImageUri, setScannedImageUriState] = useState<string | null>(null);

  const setAnalysis = useCallback((result: AnalysisResult | null) => {
    setAnalysisState(result);
  }, []);

  const setScannedImageUri = useCallback((uri: string | null) => {
    setScannedImageUriState(uri);
  }, []);

  return (
    <ScanContext.Provider value={{ analysis, setAnalysis, scannedImageUri, setScannedImageUri }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  return useContext(ScanContext);
}
