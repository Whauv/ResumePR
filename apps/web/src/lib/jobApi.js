import { apiJson } from "./api";

export async function parseJob(body) {
  return apiJson("/api/jobs/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function fetchLatestExtensionJob() {
  return apiJson("/api/jobs/latest/from-extension");
}
