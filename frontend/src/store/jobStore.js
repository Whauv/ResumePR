import { create } from "zustand";

export const useJobStore = create((set) => ({
  activeTab: "url",
  jobState: "idle",
  jobError: "",
  parsedJob: null,
  extensionJobId: "",
  setActiveTab: (activeTab) => set({ activeTab }),
  setJobState: (jobState) => set({ jobState }),
  setJobError: (jobError) => set({ jobError, jobState: "error" }),
  setParsedJob: (parsedJob) => set({ parsedJob, jobState: "success", jobError: "" }),
  setExtensionJobId: (extensionJobId) => set({ extensionJobId }),
  clearJobError: () => set({ jobError: "" }),
  clearParsedJob: () => set({ parsedJob: null, jobState: "idle", jobError: "" })
}));
