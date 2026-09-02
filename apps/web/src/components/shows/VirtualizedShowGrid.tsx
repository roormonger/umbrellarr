import { useVirtualizer } from "@tanstack/react-virtual";
import type { SeriesListItem } from "@umbrellarr/shared";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import type { LibraryGroup } from "@/lib/libraryDedup";
import { columnCount, getPosterScale } from "@/lib/posterScale";
import classes from "./VirtualizedShowGrid.module.css";

function seriesDomId(group: LibraryGroup<SeriesListItem>) {
  return `series-${group.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function VirtualizedShowGrid({
  groups,
  instanceNames,
  posterSize,
  zoomScale = 1,
  activeLetter,
  onActiveLetterChange,
  onEditSeries,
  jumperRef,
}: {
  groups: LibraryGroup<SeriesListItem>[];
  instanceNames: Map<string, string>;
  posterSize: number;
  zoomScale?: number;
  activeLetter: string;
  onActiveLetterChange: (letter: string) => void;
  onEditSeries?: (item: SeriesListItem) => void;
  jumperRef: MutableRefObject<((letter: AlphabetKey) => void) | null>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const scale = useMemo(() => getPosterScale(posterSize), [posterSize]);
  const columns = useMemo(
    () => columnCount(width, scale.posterSize, scale.gapPx),
    [width, scale.posterSize, scale.gapPx],
  );
  const rowCount = Math.ceil(groups.length / columns);

  const firstIndexByLetter = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < groups.length; i++) {
      const item = groups[i]!.primary;
      const letter = letterKey(item.sortTitle ?? item.title);
      if (!map.has(letter)) map.set(letter, i);
    }
    return map;
  }, [groups]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth(next);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => scale.rowHeight,
    overscan: 8,
  });

  const isPreviewing = zoomScale !== 1;
  const [zoomOriginY, setZoomOriginY] = useState(0);
  const anchorIndexRef = useRef(0);
  const prevPosterSizeRef = useRef(posterSize);

  if (!isPreviewing && prevPosterSizeRef.current === posterSize) {
    const first = rowVirtualizer.getVirtualItems()[0];
    if (first) {
      anchorIndexRef.current = Math.min(first.index * columns, groups.length - 1);
    }
  }

  useLayoutEffect(() => {
    if (!isPreviewing) return;
    setZoomOriginY(viewportRef.current?.scrollTop ?? 0);
  }, [isPreviewing]);

  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [scale.rowHeight, columns, rowVirtualizer]);

  useLayoutEffect(() => {
    if (prevPosterSizeRef.current === posterSize) return;
    const row = Math.floor(anchorIndexRef.current / columns);
    rowVirtualizer.scrollToIndex(row, { align: "start" });
    prevPosterSizeRef.current = posterSize;
  }, [posterSize, columns, rowVirtualizer]);

  useEffect(() => {
    jumperRef.current = (letter: AlphabetKey) => {
      const index = firstIndexByLetter.get(letter);
      if (index == null) return;
      const row = Math.floor(index / columns);
      rowVirtualizer.scrollToIndex(row, { align: "start" });
      onActiveLetterChange(letter);
    };
    return () => {
      jumperRef.current = null;
    };
  }, [columns, firstIndexByLetter, jumperRef, onActiveLetterChange, rowVirtualizer]);

  const activeLetterRef = useRef(activeLetter);
  activeLetterRef.current = activeLetter;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || groups.length === 0) return;

    const syncActiveLetter = () => {
      const items = rowVirtualizer.getVirtualItems();
      const firstRow = items[0]?.index ?? 0;
      const index = Math.min(firstRow * columns, groups.length - 1);
      const item = groups[index]?.primary;
      if (!item) return;
      const letter = letterKey(item.sortTitle ?? item.title);
      if (letter !== activeLetterRef.current) onActiveLetterChange(letter);
    };

    syncActiveLetter();
    viewport.addEventListener("scroll", syncActiveLetter, { passive: true });
    return () => viewport.removeEventListener("scroll", syncActiveLetter);
  }, [columns, groups, onActiveLetterChange, rowVirtualizer]);

  return (
    <div ref={viewportRef} className={classes.viewport}>
      <div
        className={isPreviewing ? `${classes.inner} ${classes.innerPreview}` : classes.inner}
        style={{
          height: rowVirtualizer.getTotalSize(),
          transform: isPreviewing ? `scale(${zoomScale})` : undefined,
          transformOrigin: `0px ${zoomOriginY}px`,
          ...scale.style,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowGroups = groups.slice(start, start + columns);

          return (
            <div
              key={virtualRow.key}
              className={classes.row}
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `var(--poster-gap)`,
              }}
            >
              {rowGroups.map((group) => {
                const id = seriesDomId(group);
                return (
                  <div key={group.key} id={id}>
                    <ShowPosterCard
                      group={group}
                      instanceNames={instanceNames}
                      onEdit={onEditSeries}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
