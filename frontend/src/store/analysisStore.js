import { create } from "zustand";

export const useAnalysisStore = create((set) => ({
  analysisState: "idle",
  analysisError: "",
  analysis: null,
  suggestionState: "idle",
  suggestionError: "",
  suggestionBatchId: "",
  suggestionResumeId: "",
  suggestionJobId: "",
  suggestions: [],
  decisions: {},
  setAnalysisState: (analysisState) => set({ analysisState }),
  setAnalysisError: (analysisError) => set({ analysisError, analysisState: "error" }),
  setAnalysis: (analysis) => set({ analysis, analysisState: "success", analysisError: "" }),
  clearAnalysis: () => set({ analysis: null, analysisState: "idle", analysisError: "" }),
  setSuggestionState: (suggestionState) => set({ suggestionState }),
  setSuggestionError: (suggestionError) => set({ suggestionError, suggestionState: "error" }),
  setSuggestions: (payload) =>
    set({
      suggestionBatchId: payload.suggestion_batch_id,
      suggestionResumeId: payload.resume_id || "",
      suggestionJobId: payload.job_id || "",
      suggestions: payload.suggestions,
      decisions: {},
      suggestionState: "success",
      suggestionError: ""
    }),
  setDecision: (suggestionId, decision) =>
    set((state) => ({
      decisions: {
        ...state.decisions,
        [suggestionId]: state.decisions[suggestionId] === decision ? "undecided" : decision
      }
    })),
  setAllDecisions: (decision) =>
    set((state) => ({
      decisions: Object.fromEntries(state.suggestions.map((suggestion) => [suggestion.id, decision]))
    })),
  clearSuggestions: () =>
    set({
      suggestionBatchId: "",
      suggestionResumeId: "",
      suggestionJobId: "",
      suggestions: [],
      decisions: {},
      suggestionState: "idle",
      suggestionError: ""
    })
}));
