import { POSTER_SIZE_MAX, POSTER_SIZE_MIN } from "@/components/movies/MoviesToolbar";
import type { CSSProperties } from "react";

export type PosterScale = {
  posterSize: number;
  gapPx: number;
  titleSizeRem: number;
  badgeSizePx: number;
  barSizePx: number;
  radiusPx: number;
  rowHeight: number;
  style: CSSProperties;
};

/** Shared metrics for zoom slider, CSS vars, and virtualized row height. */
export function getPosterScale(posterSize: number): PosterScale {
  const t = (posterSize - POSTER_SIZE_MIN) / (POSTER_SIZE_MAX - POSTER_SIZE_MIN);
  const titleSizeRem = 0.65 + t * 0.35;
  const badgeSizePx = 16 + t * 14;
  const barSizePx = 3 + t * 3;
  const gapRem = 0.55 + t * 0.55;
  const gapPx = gapRem * 16;
  const radiusPx = 6 + t * 6;
  const posterHeight = posterSize * 1.5;
  const titleBlock = titleSizeRem * 16 * 1.25 * 2 + 8;
  const rowHeight = posterHeight + titleBlock + gapPx;

  return {
    posterSize,
    gapPx,
    titleSizeRem,
    badgeSizePx,
    barSizePx,
    radiusPx,
    rowHeight,
    style: {
      ["--poster-min" as string]: `${posterSize}px`,
      ["--poster-gap" as string]: `${gapRem}rem`,
      ["--poster-title-size" as string]: `${titleSizeRem}rem`,
      ["--poster-badge-size" as string]: `${badgeSizePx}px`,
      ["--poster-bar-size" as string]: `${barSizePx}px`,
      ["--poster-radius" as string]: `${radiusPx}px`,
    },
  };
}

export function columnCount(width: number, posterSize: number, gapPx: number): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.floor((width + gapPx) / (posterSize + gapPx)));
}
