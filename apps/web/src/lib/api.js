import { firebaseAuth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function authHeaders() {
  const user = firebaseAuth.currentUser;
  const token = user ? await user.getIdToken() : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function withQuery(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, String(value)])
  );
  return query.toString() ? `${path}?${query.toString()}` : path;
}

export async function apiFetch(path, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(await authHeaders()),
      ...(options.headers || {})
    }
  });
}

async function parseErrorPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  const text = await response.text().catch(() => "");
  return text ? { detail: text } : null;
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.detail || "Request failed.", response.status, payload);
  }
  return payload;
}

export async function apiBlob(path, options = {}) {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    throw new ApiError(payload?.detail || "Request failed.", response.status, payload);
  }
  return response.blob();
}
