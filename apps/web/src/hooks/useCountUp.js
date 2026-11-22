import { useEffect, useState } from "react";

/**
 * Animates a number from 0 up to `target` over `duration` ms.
 * Returns the raw float by default; pass `{ round: true }` to get an integer.
 */
export default function useCountUp(target, { duration = 900, round = false } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return round ? Math.round(value) : value;
}
