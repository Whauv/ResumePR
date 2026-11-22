import { apiJson } from "./api";

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiJson("/api/resume/upload", {
    method: "POST",
    body: formData
  });
}

export async function applyAcceptedEdits(resumeId, acceptedEditIds) {
  return apiJson("/api/resume/apply-edits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, accepted_edit_ids: acceptedEditIds })
  });
}
