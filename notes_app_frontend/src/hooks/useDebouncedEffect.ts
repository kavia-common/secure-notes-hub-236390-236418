"use client";

import { useEffect, useRef } from "react";

// PUBLIC_INTERFACE
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delayMs: number
) {
  const cleanupRef = useRef<void | (() => void)>(undefined);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = effect();
    }, delayMs);

    return () => {
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);
}
