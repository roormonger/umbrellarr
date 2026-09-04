import { Button, Text } from "@mantine/core";
import type { DiscoverFeaturedItem } from "@umbrellarr/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDiscoverAdd } from "@/components/discover/DiscoverAddContext";
import { DiscoverAddSplitButton } from "@/components/discover/DiscoverAddSplitButton";
import classes from "./Discover.module.css";

const AUTO_ADVANCE_MS = 6_000;

export function DiscoverFeaturedHero({
  items,
  instanceId,
}: {
  items: DiscoverFeaturedItem[];
  instanceId: string;
}) {
  const navigate = useNavigate();
  const { openAdd, isAdding } = useDiscoverAdd();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slideCount = items.length;
  const active = slideCount > 0 ? items[Math.min(index, slideCount - 1)]! : null;

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (paused || isAdding || slideCount <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, isAdding, slideCount]);

  if (!active) return null;

  function openTitle() {
    void navigate({
      to: "/discover/$instanceId/$mediaType/$tmdbId",
      params: {
        instanceId,
        mediaType: active!.mediaType,
        tmdbId: String(active!.tmdbId),
      },
    });
  }

  return (
    <section className={classes.section} aria-label="Featured">
      <Text className={classes.sectionTitle}>Featured</Text>
      <div
        className={classes.featured}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        {active.backdropUrl ? (
          <img
            key={`${active.mediaType}-${active.tmdbId}-backdrop`}
            src={active.backdropUrl}
            alt=""
            className={classes.featuredBackdrop}
          />
        ) : null}
        <div className={classes.featuredScrim} aria-hidden />
        <div className={classes.featuredContent}>
          <button type="button" className={classes.featuredTitleButton} onClick={openTitle}>
            <h2 className={classes.featuredTitle}>
              {active.title}
              {active.year ? ` (${active.year})` : ""}
            </h2>
          </button>
          {active.overview ? (
            <p className={classes.featuredOverview}>{active.overview}</p>
          ) : null}
          <div className={classes.featuredActions}>
            <Button
              type="button"
              variant="filled"
              radius="md"
              className={classes.featuredCheckButton}
              onClick={openTitle}
            >
              Check it out
            </Button>
            <DiscoverAddSplitButton
              key={active.mediaType}
              mediaType={active.mediaType}
              variant="featured"
              onAdd={(targetInstanceId) =>
                openAdd({
                  mediaType: active.mediaType,
                  tmdbId: active.tmdbId,
                  titleHint: active.title,
                  instanceId: targetInstanceId,
                })
              }
            />
          </div>
        </div>
        {slideCount > 1 ? (
          <div className={classes.featuredDots} role="tablist" aria-label="Featured slides">
            {items.map((item, dotIndex) => (
              <button
                key={`${item.mediaType}-${item.tmdbId}`}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                aria-label={`Show ${item.title}`}
                className={`${classes.featuredDot} ${
                  dotIndex === index ? classes.featuredDotActive : ""
                }`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
