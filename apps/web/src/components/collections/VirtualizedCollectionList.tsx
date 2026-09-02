import { useVirtualizer } from "@tanstack/react-virtual";
import type { CollectionListItem } from "@umbrellarr/shared";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { CollectionRow } from "@/components/collections/CollectionRow";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import classes from "./VirtualizedCollectionList.module.css";

export function VirtualizedCollectionList({
  collections,
  selectedIds,
  onToggle,
  onActiveLetterChange,
  jumperRef,
}: {
  collections: CollectionListItem[];
  selectedIds: ReadonlySet<number>;
  onToggle: (id: number, checked: boolean) => void;
  onActiveLetterChange: (letter: string) => void;
  jumperRef: MutableRefObject<((letter: AlphabetKey) => void) | null>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const firstIndexByLetter = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < collections.length; i++) {
      const letter = letterKey(collections[i]!.sortTitle);
      if (!map.has(letter)) map.set(letter, i);
    }
    return map;
  }, [collections]);

  const virtualizer = useVirtualizer({
    count: collections.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 220,
    overscan: 8,
  });

  useEffect(() => {
    jumperRef.current = (letter: AlphabetKey) => {
      const index = firstIndexByLetter.get(letter);
      if (index == null) return;
      virtualizer.scrollToIndex(index, { align: "start" });
      onActiveLetterChange(letter);
    };
    return () => {
      jumperRef.current = null;
    };
  }, [firstIndexByLetter, jumperRef, onActiveLetterChange, virtualizer]);

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;
    const onScroll = () => {
      const first = virtualizer.getVirtualItems()[0];
      if (first == null) return;
      const collection = collections[first.index];
      if (collection) onActiveLetterChange(letterKey(collection.sortTitle));
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener("scroll", onScroll);
  }, [collections, onActiveLetterChange, virtualizer]);

  return (
    <div className={classes.scroll} ref={viewportRef}>
      <div className={classes.inner} style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const collection = collections[item.index]!;
          return (
            <div
              key={collection.externalId}
              className={classes.item}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <CollectionRow
                collection={collection}
                selected={selectedIds.has(collection.externalId)}
                onToggle={onToggle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
