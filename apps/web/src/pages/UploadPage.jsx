import { useRef, useState } from "react";
import EmptyState from "../components/EmptyState";
import CollapsibleCard from "../components/CollapsibleCard";
import ResumePreviewPanel from "../components/ResumePreviewPanel";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch } from "../lib/api";
import { useResumeStore } from "../store/resumeStore";

const acceptedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function fileBadge(file) {
  if (!file) return null;
  const extension = file.name.split(".").pop()?.toUpperCase();
  const icon = extension === "PDF" ? "PDF" : "DOCX";
  return { extension, icon };
}

async function uploadResume(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/api/resume/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Upload failed.");
  }

  return response.json();
}

export default function UploadPage() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    file,
    uploadState,
    error,
    parsedResume,
    metadata,
    setFile,
    setUploadState,
    setError,
    clearError,
    setParsedResume
  } = useResumeStore();

  const badge = fileBadge(file);

  function handleSelectedFile(nextFile) {
    if (!nextFile) return;
    if (!acceptedTypes.includes(nextFile.type) && !nextFile.name.endsWith(".docx") && !nextFile.name.endsWith(".pdf")) {
      setError("Please upload a PDF or DOCX resume.");
      return;
    }
    setFile(nextFile);
    clearError();
    setUploadState("idle");
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a resume file first.");
      return;
    }

    try {
      setUploadState("loading");
      const payload = await uploadResume(file);
      setParsedResume(payload);
    } catch (uploadError) {
      setError(uploadError.message);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(1,105,111,0.12),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f2_100%)] px-4 py-12 text-stone-900">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              Resume Parser
            </span>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-stone-950">
              Turn raw resumes into structured data you can review like a PR.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600">
              Phase 1 focuses on resume upload and parsing so the web app can become the foundation for
              accept/reject diffs, version history, and extension sync in later phases.
            </p>
          </div>

          <div
            className={`rounded-[2rem] border-2 border-dashed bg-white/90 p-8 shadow-panel transition ${
              isDragging ? "border-accent bg-accent/5" : "border-stone-300"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleSelectedFile(event.dataTransfer.files?.[0]);
            }}
          >
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-sm font-semibold text-white">
                {badge?.icon || "CV"}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-stone-950">Upload your resume</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Drag a PDF or DOCX file here, or browse from your device. We will parse the document
                  into summary, experience, education, and skills.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Choose file
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploadState === "loading"}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#01575c] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploadState === "loading" ? "Parsing..." : "Upload resume"}
                </button>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(event) => handleSelectedFile(event.target.files?.[0])}
              />

              {file ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{file.name}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-accent">
                      {badge?.extension}
                    </span>
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            </div>
          </div>
        </section>

        <section>
          {uploadState === "loading" ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-40 w-full" />
              <SkeletonBlock className="h-56 w-full" />
              <SkeletonBlock className="h-32 w-full" />
            </div>
          ) : parsedResume ? (
            <ResumePreviewPanel parsedResume={parsedResume} metadata={metadata} />
          ) : (
            <EmptyState
              art="arrow"
              title="Upload your resume to get started"
              description="Once your PDF or DOCX is parsed, the structured preview will appear here."
            />
          )}
        </section>
      </div>
    </main>
  );
}
