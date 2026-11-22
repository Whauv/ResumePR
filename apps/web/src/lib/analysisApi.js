import { apiJson } from "./api";

export async function runGapAnalysis(resumeId, jobId) {
  return apiJson("/api/analysis/gap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId })
  });
}

export async function fetchSuggestions(resumeId, jobId) {
  return apiJson("/api/analysis/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId })
  });
}
