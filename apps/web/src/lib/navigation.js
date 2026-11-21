export function navigateTo(pathname, { replace = false } = {}) {
  const nextPath = pathname || "/";
  if (window.location.pathname === nextPath) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
