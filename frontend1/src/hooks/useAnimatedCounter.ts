'use client';
import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(target: number, duration = 2000, startDelay = 0) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(ease * target));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setValue(target);
        }
      };
      frameRef.current = requestAnimationFrame(animate);
    }, startDelay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, startDelay]);

  return value;
}
