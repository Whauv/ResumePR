export function isE2EMode() {
  return new URLSearchParams(window.location.search).get("e2e") === "1";
}

export function e2ePage() {
  return new URLSearchParams(window.location.search).get("page") || "resume";
}
