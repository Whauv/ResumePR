import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GapAnalysisPanel from "./GapAnalysisPanel";

const report = {
  overall_score: 72,
  sections: {
    skills: { score: 60, matched: ["Python"], missing: ["AWS"] },
    experience: { score: 50, matched: ["APIs"], missing: ["Docker"] },
    summary: { score: 40, matched: [], missing: [] }
  },
  top_missing_keywords: ["AWS", "Docker"],
  ats_red_flags: ["No summary section detected."]
};

describe("GapAnalysisPanel empty state", () => {
  it("prompts to run analysis and fires onAnalyze", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<GapAnalysisPanel report={null} analysisState="idle" analysisError="" onAnalyze={onAnalyze} onFixSection={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run Skills Gap Analysis" }));
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("surfaces an analysis error", () => {
    render(<GapAnalysisPanel report={null} analysisState="error" analysisError="Gap analysis failed." onAnalyze={vi.fn()} onFixSection={vi.fn()} />);
    expect(screen.getByText("Gap analysis failed.")).toBeInTheDocument();
  });
});

describe("GapAnalysisPanel with a report", () => {
  it("renders section cards, missing keywords and red flags", () => {
    render(<GapAnalysisPanel report={report} analysisState="success" analysisError="" onAnalyze={vi.fn()} onFixSection={vi.fn()} />);

    expect(screen.getByText("ATS Match")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Experience" })).toBeInTheDocument();
    expect(screen.getByText("1. AWS")).toBeInTheDocument();
    expect(screen.getByText("No summary section detected.")).toBeInTheDocument();
  });

  it("routes a section fix to onFixSection", async () => {
    const onFixSection = vi.fn();
    const user = userEvent.setup();
    render(<GapAnalysisPanel report={report} analysisState="success" analysisError="" onAnalyze={vi.fn()} onFixSection={onFixSection} />);

    const fixButtons = screen.getAllByRole("button", { name: "Fix These Now" });
    await user.click(fixButtons[0]);
    expect(onFixSection).toHaveBeenCalledWith("skills");
  });
});
