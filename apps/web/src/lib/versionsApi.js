import { apiJson } from "./api";

export async function fetchVersionSummaries(resumeId) {
  const payload = await apiJson(`/api/versions/${resumeId}`);
  return payload.versions;
}

export async function fetchFullVersions(resumeId) {
  const payload = await apiJson(`/api/resume/${resumeId}/versions`);
  return payload.versions;
}

export async function fetchVersionDiff(versionId) {
  return apiJson(`/api/versions/${versionId}/diff`);
}
