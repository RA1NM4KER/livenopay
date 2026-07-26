"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

type ScrollHintProps = {
  containerRef: RefObject<HTMLElement | null>;
};

// A small nudging arrow that hints a row can be swiped horizontally.
// Hides itself once the container overflows (desktop grid) or once the
// user scrolls it for the first time, so it never nags twice.
export function ScrollHint({ containerRef }: ScrollHintProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const updateOverflow = () => setShow(el.scrollWidth > el.clientWidth + 4);
    updateOverflow();

    const onScroll = () => {
      if (el.scrollLeft > 8) {
        setShow(false);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateOverflow);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateOverflow);
    };
  }, [containerRef]);

  if (!show) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-1 z-10 flex items-center">
      <div className="animate-nudge-x flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-muted shadow-sm">
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </div>
    </div>
  );
}
