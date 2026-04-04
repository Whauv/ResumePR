import { useEffect } from "react";

export default function useAmbientMotion() {
  useEffect(() => {
    let frame = 0;

    function setPointerVariables(clientX, clientY) {
      document.documentElement.style.setProperty("--mouse-x", `${clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${clientY}px`);
    }

    function updateScrollVariable() {
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const progress = window.scrollY / maxScroll;
      document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
    }

    function handleMouseMove(event) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPointerVariables(event.clientX, event.clientY));
    }

    setPointerVariables(window.innerWidth * 0.72, window.innerHeight * 0.18);
    updateScrollVariable();

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", updateScrollVariable, { passive: true });
    window.addEventListener("resize", updateScrollVariable);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", updateScrollVariable);
      window.removeEventListener("resize", updateScrollVariable);
    };
  }, []);
}
