import { useEffect } from "react";
import { fetchFullVersions, fetchVersionSummaries } from "../lib/versionsApi";
import { useResumeStore } from "../store/resumeStore";

/**
 * Lazily loads version summaries + full versions for the active resume so the
 * header dropdown and version history are populated. No-op when disabled or
 * when there is no resume yet; stays quiet on error.
 */
export default function useVersionHydration(enabled) {
  const { metadata, versions, versionSummaries, setVersions, setVersionSummaries } = useResumeStore();

  useEffect(() => {
    if (!enabled || !metadata?.resumeId) return undefined;
    let cancelled = false;

    async function hydrate() {
      try {
        const tasks = [];
        if (!versionSummaries.length) {
          tasks.push(fetchVersionSummaries(metadata.resumeId).then((data) => ({ kind: "summary", data })));
        }
        if (!versions.length) {
          tasks.push(fetchFullVersions(metadata.resumeId).then((data) => ({ kind: "full", data })));
        }
        const results = await Promise.all(tasks);
        if (cancelled) return;
        for (const result of results) {
          if (result.kind === "summary") setVersionSummaries(result.data);
          if (result.kind === "full") setVersions(result.data);
        }
      } catch (_error) {
        // Keep the header quiet if version data is not ready yet.
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [enabled, metadata?.resumeId, setVersionSummaries, setVersions, versionSummaries.length, versions.length]);
}
