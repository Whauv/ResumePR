import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({
  firebaseAuth: {
    currentUser: null
  }
}));

import { ApiError, apiBlob, apiFetch, apiJson, withQuery } from "./api";
import { firebaseAuth } from "./firebase";

describe("api helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    firebaseAuth.currentUser = null;
  });

  it("builds query strings without empty values", () => {
    expect(withQuery("/api/test", { format: "pdf", template: "", version: 3 })).toBe("/api/test?format=pdf&version=3");
  });

  it("returns JSON payloads for successful requests", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(apiJson("/api/test")).resolves.toEqual({ ok: true });
  });

  it("throws ApiError for failed blob requests", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Export failed.", request_id: "req-123" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    );

    try {
      await apiBlob("/api/test");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ message: "Export failed.", status: 400 });
      expect(error.requestId).toBe("req-123");
    }
  });

  it("uses a plain-text error body as the ApiError detail", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("upstream exploded", {
        status: 502,
        headers: { "Content-Type": "text/plain" }
      })
    );

    await expect(apiJson("/api/test")).rejects.toMatchObject({
      message: "upstream exploded",
      status: 502
    });
  });

  it("injects the Firebase bearer token when a user is signed in", async () => {
    firebaseAuth.currentUser = { getIdToken: async () => "tok-abc" };
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );

    await apiFetch("/api/secure");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok-abc");
  });

  it("omits the Authorization header when signed out", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );

    await apiFetch("/api/public");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });
});
