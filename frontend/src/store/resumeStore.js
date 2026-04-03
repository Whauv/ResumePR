import { create } from "zustand";

export const useResumeStore = create((set) => ({
  file: null,
  uploadState: "idle",
  error: "",
  parsedResume: null,
  metadata: null,
  setFile: (file) => set({ file, error: "" }),
  clearFile: () => set({ file: null }),
  setUploadState: (uploadState) => set({ uploadState }),
  setError: (error) => set({ error, uploadState: "error" }),
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
    })
}));
