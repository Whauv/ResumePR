import { useEffect } from "react";
import { useAnalysisStore } from "../store/analysisStore";
import { useAppStore } from "../store/appStore";
import { useJobStore } from "../store/jobStore";
import { useResumeStore } from "../store/resumeStore";
import {
  E2E_ANALYSIS,
  E2E_JOB,
  E2E_RESUME_PAYLOAD,
  E2E_SUGGESTIONS,
  E2E_VERSION,
  E2E_VERSION_SUMMARY
} from "../test/e2eFixture";

/** Seeds the stores with deterministic fixture data for Playwright smoke runs. */
export default function useE2EBootstrap(enabled) {
  const { setParsedResume, setVersions, setVersionSummaries } = useResumeStore();
  const { setParsedJob } = useJobStore();
  const { setAnalysis, setSuggestions } = useAnalysisStore();
  const { setLatestVersionId } = useAppStore();

  useEffect(() => {
    if (!enabled) return;
    setParsedResume(E2E_RESUME_PAYLOAD);
    setParsedJob(E2E_JOB);
    setAnalysis(E2E_ANALYSIS);
    setSuggestions(E2E_SUGGESTIONS);
    setVersions([E2E_VERSION]);
    setVersionSummaries([E2E_VERSION_SUMMARY]);
    setLatestVersionId(E2E_VERSION.version_id);
  }, [
    enabled,
    setAnalysis,
    setLatestVersionId,
    setParsedJob,
    setParsedResume,
    setSuggestions,
    setVersionSummaries,
    setVersions
  ]);
}
