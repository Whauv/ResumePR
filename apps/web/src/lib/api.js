import { firebaseAuth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL || "";

export async function apiFetch(path, options = {}) {
  const user = firebaseAuth.currentUser;
  const token = user ? await user.getIdToken() : "";
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  return response;
}
