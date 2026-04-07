import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadPage from "./UploadPage";
import { useResumeStore } from "../store/resumeStore";

vi.mock("../lib/api", () => ({
  apiJson: vi.fn()
}));

vi.mock("../components/ResumePreviewPanel", () => ({
  default: ({ parsedResume }) => <div>Preview: {parsedResume?.name}</div>
}));

vi.mock("../components/EmptyState", () => ({
  default: ({ title }) => <div>{title}</div>
}));

vi.mock("../components/SkeletonBlock", () => ({
  default: () => <div>Loading</div>
}));

import { apiJson } from "../lib/api";

describe("UploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useResumeStore.setState({
      file: null,
      uploadState: "idle",
      error: "",
      parsedResume: null,
      metadata: null,
      versions: [],
      versionSummaries: []
    });
  });

  it("shows an error for unsupported file types", async () => {
    const { container } = render(<UploadPage />);
    const fileInput = container.querySelector('input[type="file"]');
    const invalidFile = new File(["hello"], "resume.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByText("Please upload a PDF or DOCX resume.")).toBeInTheDocument();
  });

  it("uploads a selected resume and shows the parsed preview", async () => {
    apiJson.mockResolvedValue({
      resume_id: "resume-1",
      file_name: "resume.docx",
      file_type: "docx",
      parsed_resume: {
        name: "Jane Doe",
        contact: { email: "jane@example.com" },
        summary: "Summary",
        experience: [],
        education: [],
        skills: ["Python"]
      }
    });

    const user = userEvent.setup();
    const { container } = render(<UploadPage />);
    const fileInput = container.querySelector('input[type="file"]');
    const validFile = new File(["resume"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    fireEvent.change(fileInput, { target: { files: [validFile] } });
    await user.click(screen.getByRole("button", { name: "Upload resume" }));

    await waitFor(() => {
      expect(apiJson).toHaveBeenCalledWith("/api/resume/upload", expect.objectContaining({ method: "POST" }));
    });
    expect(await screen.findByText("Preview: Jane Doe")).toBeInTheDocument();
  });
});
