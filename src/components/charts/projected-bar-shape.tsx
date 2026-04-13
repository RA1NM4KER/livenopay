import { chartColors } from "./chart-config";
import type { ProjectedBarShapeProps } from "./types";

export function ProjectedBarShape({ x = 0, y = 0, width = 0, height = 0 }: ProjectedBarShapeProps) {
  if (height <= 0 || width <= 0) {
    return null;
  }

  const radius = Math.min(4, width / 2, height);
  const bottom = y + height;
  const right = x + width;

  return (
    <path
      d={[
        `M ${x} ${bottom}`,
        `L ${x} ${y + radius}`,
        `Q ${x} ${y} ${x + radius} ${y}`,
        `L ${right - radius} ${y}`,
        `Q ${right} ${y} ${right} ${y + radius}`,
        `L ${right} ${bottom}`
      ].join(" ")}
      fill="none"
      stroke={chartColors.projection}
      strokeDasharray="3 3"
      strokeWidth={1.8}
    />
  );
}
