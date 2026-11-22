import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useJobStore } from "./jobStore";
import { useAnalysisStore } from "./analysisStore";
import { useResumeStore } from "./resumeStore";
import { useThemeStore } from "./themeStore";

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.setState({ activePage: "resume", focusSection: "", latestVersionId: "" });
  });

  it("sets active page and focus section", () => {
    useAppStore.getState().setActivePage("diff");
    useAppStore.getState().setFocusSection("skills");
    expect(useAppStore.getState().activePage).toBe("diff");
    expect(useAppStore.getState().focusSection).toBe("skills");

    useAppStore.getState().setFocusSection("");
    expect(useAppStore.getState().focusSection).toBe("");
  });
});

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ authUser: null, authState: "loading", authError: "" });
  });

  it("captures the user and authenticated state on sign-in, clears on sign-out", () => {
    useAuthStore.getState().setAuthUser({ uid: "user-9" });
    expect(useAuthStore.getState()).toMatchObject({
      authUser: { uid: "user-9" },
      authState: "authenticated"
    });

    useAuthStore.getState().setSignedOut();
    expect(useAuthStore.getState()).toMatchObject({ authUser: null, authState: "signed_out" });
  });

  it("records errors with an error state", () => {
    useAuthStore.getState().setAuthError("bad password");
    expect(useAuthStore.getState()).toMatchObject({ authError: "bad password", authState: "error" });
  });
});

describe("themeStore", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("resumepr_theme");
    } catch (_error) {
      // ignore
    }
    useThemeStore.setState({ theme: "light" });
  });

  it("toggles between light and dark and persists the choice", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("resumepr_theme")).toBe("dark");

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("setTheme applies an explicit theme", () => {
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});

describe("jobStore", () => {
  beforeEach(() => {
    useJobStore.setState({ activeTab: "url", jobState: "idle", jobError: "", parsedJob: null });
  });

  it("moves to success on parsed job and resets on clear", () => {
    useJobStore.getState().setParsedJob({ job_title: "SRE" });
    expect(useJobStore.getState()).toMatchObject({ parsedJob: { job_title: "SRE" }, jobState: "success" });

    useJobStore.getState().clearParsedJob();
    expect(useJobStore.getState()).toMatchObject({ parsedJob: null, jobState: "idle" });
  });

  it("flags errors", () => {
    useJobStore.getState().setJobError("scrape failed");
    expect(useJobStore.getState()).toMatchObject({ jobError: "scrape failed", jobState: "error" });
  });
});

describe("analysisStore", () => {
  beforeEach(() => {
    useAnalysisStore.setState({ suggestions: [], decisions: {}, suggestionState: "idle" });
  });

  it("toggles a single decision off when repeated", () => {
    const { setDecision } = useAnalysisStore.getState();
    setDecision("s1", "accepted");
    expect(useAnalysisStore.getState().decisions.s1).toBe("accepted");
    setDecision("s1", "accepted");
    expect(useAnalysisStore.getState().decisions.s1).toBe("undecided");
  });

  it("applies a decision to all current suggestions", () => {
    useAnalysisStore.setState({ suggestions: [{ id: "a" }, { id: "b" }] });
    useAnalysisStore.getState().setAllDecisions("rejected");
    expect(useAnalysisStore.getState().decisions).toEqual({ a: "rejected", b: "rejected" });
  });

  it("resets decisions when a new suggestion batch arrives", () => {
    useAnalysisStore.setState({ decisions: { a: "accepted" } });
    useAnalysisStore.getState().setSuggestions({
      suggestion_batch_id: "batch-1",
      suggestions: [{ id: "a" }]
    });
    expect(useAnalysisStore.getState()).toMatchObject({
      suggestionBatchId: "batch-1",
      suggestionState: "success",
      decisions: {}
    });
  });
});

describe("resumeStore", () => {
  beforeEach(() => {
    useResumeStore.setState({
      parsedResume: null,
      metadata: null,
      versions: [],
      versionSummaries: [],
      uploadState: "idle",
      error: ""
    });
  });

  it("stores parsed upload payload with metadata", () => {
    useResumeStore.getState().setParsedResume({
      parsed_resume: { name: "Jane" },
      resume_id: "r1",
      file_name: "cv.docx",
      file_type: "docx"
    });
    expect(useResumeStore.getState()).toMatchObject({
      parsedResume: { name: "Jane" },
      metadata: { resumeId: "r1", fileName: "cv.docx", fileType: "docx" },
      uploadState: "success"
    });
  });

  // Locks the hand-built optimistic reshaping (a flagged refactor risk): the
  // summary object renames metadata fields (accepted_count -> accepted_edits_count,
  // role -> job_title) and both lists are prepended to.
  it("prepends an optimistic version + summary with remapped fields", () => {
    useResumeStore.setState({
      metadata: { resumeId: "r1" },
      versions: [{ version_id: "v1" }],
      versionSummaries: [{ version_id: "v1" }]
    });

    useResumeStore.getState().setUpdatedResumeVersion({
      version_id: "v2",
      updated_resume: { name: "Jane v2" },
      metadata: {
        version_number: 2,
        role: "Platform Engineer",
        company_name: "Acme",
        timestamp: "2026-01-01T00:00:00Z",
        accepted_count: 3,
        ats_score_before: 50,
        ats_score_after: 72
      }
    });

    const state = useResumeStore.getState();
    expect(state.parsedResume).toEqual({ name: "Jane v2" });

    expect(state.versions).toHaveLength(2);
    expect(state.versions[0]).toMatchObject({
      version_id: "v2",
      base_resume_id: "r1",
      resume_json: { name: "Jane v2" }
    });

    expect(state.versionSummaries).toHaveLength(2);
    expect(state.versionSummaries[0]).toEqual({
      version_id: "v2",
      version_number: 2,
      job_title: "Platform Engineer",
      company_name: "Acme",
      timestamp: "2026-01-01T00:00:00Z",
      accepted_edits_count: 3,
      ats_score_before: 50,
      ats_score_after: 72
    });
  });

  it("restoreVersion swaps parsedResume to the matching version, no-ops when absent", () => {
    useResumeStore.setState({
      versions: [{ version_id: "v1", resume_json: { name: "old" } }],
      parsedResume: { name: "current" }
    });

    useResumeStore.getState().restoreVersion("v1");
    expect(useResumeStore.getState().parsedResume).toEqual({ name: "old" });

    useResumeStore.getState().restoreVersion("missing");
    expect(useResumeStore.getState().parsedResume).toEqual({ name: "old" });
  });
});
