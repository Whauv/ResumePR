import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({
  firebaseAuth: {
    currentUser: null
  }
}));

import { ApiError, apiBlob, apiJson, withQuery } from "./api";

describe("api helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
