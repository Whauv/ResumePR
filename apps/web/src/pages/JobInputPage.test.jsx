import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JobInputPage from "./JobInputPage";
import { useAnalysisStore } from "../store/analysisStore";
import { useAppStore } from "../store/appStore";
import { useJobStore } from "../store/jobStore";
import { useResumeStore } from "../store/resumeStore";

vi.mock("../lib/api", () => ({
  apiJson: vi.fn()
}));

vi.mock("../components/ResumePreviewPanel", () => ({
  default: ({ parsedResume }) => <div>Resume: {parsedResume?.name || "none"}</div>
}));

vi.mock("../components/GapAnalysisPanel", () => ({
  default: ({ report, analysisState }) => (
    <div>
      Gap Panel
      <div>State: {analysisState}</div>
      <div>Score: {report?.overall_score ?? "none"}</div>
    </div>
  )
}));

vi.mock("../components/JobSummaryPanel", () => ({
  default: ({ parsedJob }) => <div>Job Summary: {parsedJob?.job_title}</div>
}));

vi.mock("../components/EmptyState", () => ({
  default: ({ title }) => <div>{title}</div>
}));

vi.mock("../components/CollapsibleCard", () => ({
  default: ({ title, subtitle, children }) => (
    <section>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {children}
    </section>
  )
}));

vi.mock("../components/SkeletonBlock", () => ({
  default: () => <div>Loading</div>
}));

import { apiJson } from "../lib/api";

describe("JobInputPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useResumeStore.setState({
      file: null,
      uploadState: "success",
      error: "",
      parsedResume: {
        name: "Jane Doe",
        contact: { email: "jane@example.com" },
        summary: "Summary",
        experience: [],
        education: [],
        skills: ["Python"]
      },
      metadata: { resumeId: "resume-1", fileName: "resume.docx", fileType: "docx" },
      versions: [],
      versionSummaries: []
    });
    useJobStore.setState({
      activeTab: "url",
      jobState: "idle",
      jobError: "",
      parsedJob: null,
      extensionJobId: ""
    });
    useAnalysisStore.setState({
      analysisState: "idle",
      analysisError: "",
      analysis: null,
      suggestionState: "idle",
      suggestionError: "",
      suggestionBatchId: "",
      suggestionResumeId: "",
      suggestionJobId: "",
      suggestions: [],
      decisions: {}
    });
    useAppStore.setState({
      activePage: "jobs",
      phase4TargetSection: "",
      latestVersionId: ""
    });
  });

  it("analyzes a job URL and runs gap analysis", async () => {
    apiJson.mockImplementation(async (path) => {
      if (path === "/api/jobs/latest/from-extension") {
        throw new Error("Not found");
      }
      if (path === "/api/jobs/parse") {
        return {
          job_id: "job-1",
          job_title: "Platform Engineer",
          company_name: "Example Co",
          required_skills: ["Python", "Docker"],
          preferred_skills: ["AWS"],
          experience_years: 3,
          education_requirement: "Bachelor's degree",
          raw_text: "Platform Engineer role"
        };
      }
      if (path === "/api/analysis/gap") {
        return {
          analysis_id: "analysis-1",
          resume_id: "resume-1",
          job_id: "job-1",
          report: {
            overall_score: 81,
            sections: {
              skills: { matched: ["Python"], missing: ["Docker"], semantic_matches: [], score: 75 },
              experience: { matched: [], missing: ["Docker"], semantic_matches: [], score: 68 },
              summary: { matched: ["Python"], missing: [], semantic_matches: [], score: 80 }
            },
            top_missing_keywords: ["Docker"],
            ats_red_flags: []
          }
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const user = userEvent.setup();
    render(<JobInputPage />);

    await user.type(screen.getByPlaceholderText("Paste a job posting URL"), "https://example.com/job");
    await user.click(screen.getByRole("button", { name: "Analyze URL" }));

    expect(await screen.findByText("Job Summary: Platform Engineer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Run Skills Gap Analysis" }));

    await waitFor(() => {
      expect(apiJson).toHaveBeenCalledWith(
        "/api/analysis/gap",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(await screen.findByText("Score: 81")).toBeInTheDocument();
  });
});
