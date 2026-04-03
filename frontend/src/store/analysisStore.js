import { create } from "zustand";

export const useAnalysisStore = create((set) => ({
  analysisState: "idle",
  analysisError: "",
  analysis: null,
  setAnalysisState: (analysisState) => set({ analysisState }),
  setAnalysisError: (analysisError) => set({ analysisError, analysisState: "error" }),
  setAnalysis: (analysis) => set({ analysis, analysisState: "success", analysisError: "" }),
  clearAnalysis: () => set({ analysis: null, analysisState: "idle", analysisError: "" })
}));
