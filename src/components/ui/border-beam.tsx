"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

type BorderBeamProps = {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  reverse?: boolean;
  initialOffset?: number;
  style?: CSSProperties;
};

function roundedRectPath(width: number, height: number, radius: number, inset: number) {
  const x = inset;
  const y = inset;
  const w = Math.max(0, width - inset * 2);
  const h = Math.max(0, height - inset * 2);
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));

  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`
  ].join(" ");
}

function numericBorderRadius(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 16;
}

// Adapted to local styling from Magic UI's Border Beam pattern.
export function BorderBeam({
  className = "",
  size = 40,
  duration = 7.4,
  delay = 0,
  colorFrom = "rgba(0, 128, 82, 0)",
  colorTo = "rgba(0, 128, 82, 0.98)",
  borderWidth = 1.5,
  reverse = false,
  initialOffset = 0,
  style
}: BorderBeamProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [path, setPath] = useState("");
  const [viewBox, setViewBox] = useState({ width: 100, height: 44 });
  const [pathLength, setPathLength] = useState(100);
  const [beamLength, setBeamLength] = useState(size);
  const [beamGlowWidth, setBeamGlowWidth] = useState(Math.max(3.2, borderWidth * 2.2));
  const gradientId = useId().replace(/:/g, "");
  const glowId = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const update = () => {
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const radius = numericBorderRadius(computed.borderTopLeftRadius);
      const nextPath = roundedRectPath(rect.width, rect.height, radius, borderWidth);
      const nextViewBox = {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height)
      };
      const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svgPath.setAttribute("d", nextPath);
      const nextPathLength = Math.max(1, svgPath.getTotalLength());

      setPath(nextPath);
      setViewBox(nextViewBox);
      setPathLength(nextPathLength);
      setBeamLength(Math.min(size, Math.max(20, nextPathLength * 0.14)));
      setBeamGlowWidth(Math.max(3.2, borderWidth * 2.2));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [borderWidth, size]);

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" ref={containerRef}>
      {path ? (
        <svg
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full ${className}`}
          preserveAspectRatio="none"
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          style={style}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="50%" stopColor={colorTo} />
              <stop offset="100%" stopColor={colorFrom} />
            </linearGradient>
            <filter id={glowId} x="-200%" y="-200%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="0.7" />
            </filter>
          </defs>

          <path
            d={path}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeWidth={beamGlowWidth}
            strokeDasharray={`${beamLength} ${Math.max(1, pathLength - beamLength)}`}
            filter={`url(#${glowId})`}
          >
            <animate
              attributeName="stroke-dashoffset"
              begin={`${delay}s`}
              dur={`${duration}s`}
              from={reverse ? "0" : `${pathLength - initialOffset}`}
              repeatCount="indefinite"
              to={reverse ? `${pathLength - initialOffset}` : "0"}
            />
          </path>

          <path
            d={path}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeWidth={Math.max(borderWidth + 0.2, 1.35)}
            strokeDasharray={`${beamLength} ${Math.max(1, pathLength - beamLength)}`}
          >
            <animate
              attributeName="stroke-dashoffset"
              begin={`${delay}s`}
              dur={`${duration}s`}
              from={reverse ? "0" : `${pathLength - initialOffset}`}
              repeatCount="indefinite"
              to={reverse ? `${pathLength - initialOffset}` : "0"}
            />
          </path>
        </svg>
      ) : null}
    </div>
  );
}
