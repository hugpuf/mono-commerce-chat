import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Detects whether the current viewport width is below the mobile breakpoint.
 *
 * @returns `true` when the viewport width is less than `MOBILE_BREAKPOINT`, `false` otherwise.
 * @remarks
 * - Safe for SSR: the hook defaults to `false` until the browser environment is available.
 * - Re-runs only when the viewport changes, relying on the native `matchMedia` listener.
 */
export function useIsMobile() {
  const getIsMobile = () =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false;

  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
