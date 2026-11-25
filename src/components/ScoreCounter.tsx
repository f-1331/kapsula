import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface ScoreCounterProps {
  value: number;
  className?: string;
}

/**
 * Animated count-up tabular serif numeral, respecting prefers-reduced-motion.
 */
export function ScoreCounter({ value, className = '' }: ScoreCounterProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    const start = currentRef.current;
    const end = value;
    if (start === end) return;

    const duration = 360;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + (end - start) * eased);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, reduced]);

  return <span className={`font-numeral ${className}`}>{display}</span>;
}
