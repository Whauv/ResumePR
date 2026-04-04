import { useEffect } from "react";

export default function useAmbientMotion() {
  useEffect(() => {
    let frame = 0;
    let scrollFrame = 0;
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const enablePointerMotion = supportsFinePointer && !prefersReducedMotion;

    function setPointerVariables(clientX, clientY) {
      root.style.setProperty("--mouse-x", `${clientX}px`);
      root.style.setProperty("--mouse-y", `${clientY}px`);
    }

    function updateScrollVariable() {
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const progress = window.scrollY / maxScroll;
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
    }

    function handleMouseMove(event) {
      if (!enablePointerMotion) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPointerVariables(event.clientX, event.clientY));
    }

    function handleScroll() {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(updateScrollVariable);
    }

    root.dataset.motion = enablePointerMotion ? "full" : "reduced";
    setPointerVariables(window.innerWidth * 0.72, window.innerHeight * 0.18);
    updateScrollVariable();

    if (enablePointerMotion) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);
}
