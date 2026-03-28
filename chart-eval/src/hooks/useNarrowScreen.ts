import { useEffect, useState } from "react";

/** True when viewport is phone-sized (matches chart layout breakpoints). */
export function useNarrowScreen(breakpointPx: number = 640): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = `(max-width: ${breakpointPx}px)`;
    const mq = window.matchMedia(query);
    const apply = (): void => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return (): void => mq.removeEventListener("change", apply);
  }, [breakpointPx]);

  return narrow;
}
