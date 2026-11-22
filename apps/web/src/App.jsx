import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SkeletonBlock from "./components/SkeletonBlock";
import WorkspaceLayout from "./components/WorkspaceLayout";
import useAuthSession from "./hooks/useAuthSession";
import useE2EBootstrap from "./hooks/useE2EBootstrap";
import useVersionHydration from "./hooks/useVersionHydration";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import { WORKSPACE_PAGE_IDS } from "./lib/workspaceNav";
import { e2ePage, isE2EMode } from "./lib/runtime";
import { useAppStore } from "./store/appStore";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";

function resolveWorkspacePage(pathname) {
  const params = new URLSearchParams(window.location.search);
  if (pathname === "/analyze" || params.get("job_id")) return "jobs";
  return "resume";
}

export default function App() {
  const e2eMode = isE2EMode();
  const location = useLocation();
  const navigate = useNavigate();
  const routePath = location.pathname || "/";
  const { activePage, setActivePage } = useAppStore();
  const { authUser, authState } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const effectiveAuthUser = authUser || (e2eMode ? { uid: "e2e-user" } : null);

  // Apply the selected theme to <html> so the data-theme CSS tokens take effect
  // across every route.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const publicRoute = !e2eMode && routePath === "/";
  const authRoute = !e2eMode && (routePath === "/login" || routePath === "/signup");
  const workspaceRoute =
    e2eMode || routePath === "/app" || routePath.startsWith("/app/") || routePath === "/analyze";

  useAuthSession(!e2eMode);
  useE2EBootstrap(e2eMode);
  useVersionHydration(!e2eMode && Boolean(effectiveAuthUser));

  // URL -> store: keep the active workspace page in sync with the path. In E2E
  // mode the page comes from the ?page= param and the URL is left untouched.
  useEffect(() => {
    if (e2eMode) {
      setActivePage(e2ePage());
      return;
    }
    if (!workspaceRoute) return;
    const segment = routePath.startsWith("/app/") ? routePath.slice(5) : null;
    const nextPage = segment && WORKSPACE_PAGE_IDS.includes(segment) ? segment : resolveWorkspacePage(routePath);
    setActivePage(nextPage);
  }, [e2eMode, routePath, setActivePage, workspaceRoute]);

  // store -> URL: reflect page switches (nav pills, command palette) into the
  // address bar. Entry paths (/app, /analyze) normalize with replace.
  useEffect(() => {
    if (e2eMode || !workspaceRoute) return;
    const target = `/app/${activePage}`;
    if (routePath !== target) {
      navigate(target, { replace: !routePath.startsWith("/app/") });
    }
  }, [activePage, e2eMode, navigate, routePath, workspaceRoute]);

  useEffect(() => {
    if (e2eMode || !effectiveAuthUser) return;
    if (authRoute) {
      navigate("/app", { replace: true });
    }
  }, [authRoute, e2eMode, effectiveAuthUser, navigate]);

  if (publicRoute) {
    return (
      <div className="theme-app-frame relative min-h-screen overflow-x-hidden">
        <LandingPage />
      </div>
    );
  }

  if (!e2eMode && workspaceRoute && authState === "loading") {
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-5xl space-y-4">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-72 w-full" />
          <SkeletonBlock className="h-72 w-full" />
        </div>
      </main>
    );
  }

  if (authRoute) {
    return <AuthPage />;
  }

  if (!effectiveAuthUser && workspaceRoute) {
    return <AuthPage />;
  }

  return <WorkspaceLayout />;
}
