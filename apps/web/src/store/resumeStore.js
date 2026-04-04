import { create } from "zustand";

export const useResumeStore = create((set) => ({
  file: null,
  uploadState: "idle",
  error: "",
  parsedResume: null,
  metadata: null,
  versions: [],
  versionSummaries: [],
  setFile: (file) => set({ file, error: "" }),
  clearFile: () => set({ file: null }),
  setUploadState: (uploadState) => set({ uploadState }),
  setError: (error) => set({ error, uploadState: "error" }),
  clearError: () => set({ error: "" }),
  setParsedResume: (payload) =>
    set({
      parsedResume: payload.parsed_resume,
      metadata: {
        resumeId: payload.resume_id,
        fileName: payload.file_name,
        fileType: payload.file_type
      },
      uploadState: "success",
      error: ""
    }),
  setUpdatedResumeVersion: (payload) =>
    set((state) => ({
      parsedResume: payload.updated_resume,
      versions: [
        {
          version_id: payload.version_id,
          base_resume_id: state.metadata?.resumeId || "",
          metadata: payload.metadata,
          resume_json: payload.updated_resume
        },
        ...state.versions
      ],
      versionSummaries: [
        {
          version_id: payload.version_id,
          version_number: payload.metadata.version_number,
          job_title: payload.metadata.role,
          company_name: payload.metadata.company_name,
          timestamp: payload.metadata.timestamp,
          accepted_edits_count: payload.metadata.accepted_count,
          ats_score_before: payload.metadata.ats_score_before,
          ats_score_after: payload.metadata.ats_score_after
        },
        ...state.versionSummaries
      ]
    })),
  setVersions: (versions) => set({ versions }),
  setVersionSummaries: (versionSummaries) => set({ versionSummaries }),
  restoreVersion: (versionId) =>
    set((state) => {
      const version = state.versions.find((item) => item.version_id === versionId);
      if (!version) return {};
      return { parsedResume: version.resume_json };
    })
}));
