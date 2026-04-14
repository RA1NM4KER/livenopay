"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import type { ChartShellProps } from "./types";

const minZoom = 1;
const maxZoom = 2.5;

function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, value));
}

function touchDistance(touches: TouchEvent<HTMLDivElement>["touches"]) {
  const [first, second] = [touches[0], touches[1]];
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

type ExpandChartButtonProps = {
  onClick: () => void;
};

export function ExpandChartButton({ onClick }: ExpandChartButtonProps) {
  return (
    <button
      aria-label="Maximize chart"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-paper text-ink transition hover:bg-canvas"
      onClick={onClick}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="m21 3-7 7" />
        <path d="m3 21 7-7" />
      </svg>
    </button>
  );
}

type IconButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "dark";
};

function IconButton({ label, onClick, children, variant = "default" }: IconButtonProps) {
  const className =
    variant === "dark"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-paper transition hover:opacity-90"
      : "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-paper text-ink transition hover:bg-canvas";

  return (
    <button aria-label={label} className={className} onClick={onClick} type="button">
      {children}
    </button>
  );
}

type FullscreenChartProps = {
  title: string;
  action?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function FullscreenChart({ title, action, onClose, children }: FullscreenChartProps) {
  const [zoom, setZoom] = useState(1);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const updateZoom = (value: number) => setZoom(clampZoom(value));

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchStart.current = { distance: touchDistance(event.touches), zoom };
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchStart.current) {
      return;
    }

    event.preventDefault();
    updateZoom((touchDistance(event.touches) / pinchStart.current.distance) * pinchStart.current.zoom);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas/96 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Chart</p>
          <h2 className="mt-1 truncate text-lg font-semibold text-ink sm:text-xl">{title}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {action}
          <IconButton label="Zoom out" onClick={() => updateZoom(zoom - 0.25)}>
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14" />
            </svg>
          </IconButton>
          <IconButton label="Fit chart" onClick={() => updateZoom(1)}>
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <rect height="14" rx="2" width="14" x="5" y="5" />
            </svg>
          </IconButton>
          <IconButton label="Zoom in" onClick={() => updateZoom(zoom + 0.25)}>
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </IconButton>
          <IconButton label="Close chart" onClick={onClose} variant="dark">
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              viewBox="0 0 24 24"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </IconButton>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto p-3 sm:p-5"
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        <div
          className="h-full min-h-[18rem] rounded-lg border border-line bg-paper p-3 shadow-soft sm:min-h-[24rem] sm:p-5"
          style={{ minWidth: "100%", width: `${Math.round(100 * zoom)}%` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function ChartShell({ title, eyebrow, action, footer, fullScreenChildren, children }: ChartShellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const controls = (
    <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
      {action}
      <ExpandChartButton onClick={() => setIsExpanded(true)} />
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader title={title} eyebrow={eyebrow} action={controls} />
        <div className="h-64 px-1 py-4 sm:h-72 sm:px-4">{children}</div>
        {footer ? <div className="border-t border-line px-4 py-3 sm:px-5">{footer}</div> : null}
      </Card>
      {isExpanded ? (
        <FullscreenChart title={title} onClose={() => setIsExpanded(false)}>
          {fullScreenChildren ?? children}
        </FullscreenChart>
      ) : null}
    </>
  );
}
