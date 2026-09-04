import { BellIcon } from "@phosphor-icons/react/dist/csr/Bell";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import type { DiscoverCard, InstancePublic, SeerrMediaAvailability } from "@umbrellarr/shared";
import { useNavigate } from "@tanstack/react-router";
import { memo, useState } from "react";
import { useDiscoverAdd } from "@/components/discover/DiscoverAddContext";
import { setLastInstanceId } from "@/lib/lastInstance";
import classes from "./Discover.module.css";

/** Mirror Seerr `StatusBadgeMini` (cite seerr StatusBadgeMini): available / partial / pending|processing. */
function AvailabilityBadge({ availability }: { availability?: SeerrMediaAvailability }) {
  if (availability === "available") {
    return (
      <span className={`${classes.badge} ${classes.badgeAvailable}`} title="Available">
        <CheckIcon size={12} weight="bold" aria-hidden />
      </span>
    );
  }
  if (availability === "partial") {
    return (
      <span className={`${classes.badge} ${classes.badgePartial}`} title="Partially available">
        <MinusIcon size={12} weight="bold" aria-hidden />
      </span>
    );
  }
  if (availability === "pending" || availability === "processing") {
    return (
      <span className={`${classes.badge} ${classes.badgeRequested}`} title="Requested">
        <BellIcon size={11} weight="fill" aria-hidden />
      </span>
    );
  }
  return null;
}

export const DiscoverPosterCard = memo(function DiscoverPosterCard({
  item,
  instanceId,
}: {
  item: DiscoverCard;
  instanceId: string;
}) {
  const navigate = useNavigate();
  const { openAdd, radarrInstances, sonarrInstances } = useDiscoverAdd();
  const [pickerOpen, setPickerOpen] = useState(false);

  const targets: InstancePublic[] =
    item.mediaType === "movie" ? radarrInstances : sonarrInstances;
  const kind = item.mediaType === "movie" ? "radarr" : "sonarr";

  function openTitle() {
    void navigate({
      to: "/discover/$instanceId/$mediaType/$tmdbId",
      params: {
        instanceId,
        mediaType: item.mediaType,
        tmdbId: String(item.tmdbId),
      },
    });
  }

  function chooseInstance(targetInstanceId: string) {
    setLastInstanceId(kind, targetInstanceId);
    setPickerOpen(false);
    openAdd({
      mediaType: item.mediaType,
      tmdbId: item.tmdbId,
      titleHint: item.title,
      instanceId: targetInstanceId,
    });
  }

  return (
    <div
      className={classes.poster}
      onMouseLeave={() => setPickerOpen(false)}
    >
      <div className={classes.posterSurface}>
        <button
          type="button"
          className={classes.posterHit}
          onClick={openTitle}
          aria-label={item.title}
        >
          {item.posterUrl ? (
            <img src={item.posterUrl} alt="" className={classes.posterImg} loading="lazy" />
          ) : null}
        </button>
        <AvailabilityBadge availability={item.availability} />

        {targets.length > 0 ? (
          <div
            className={`${classes.posterAddDock} ${pickerOpen ? classes.posterAddDockOpen : ""}`}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {pickerOpen ? (
              <div className={classes.posterAddPicker} role="listbox" aria-label="Choose instance">
                {targets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    className={classes.posterAddPickerItem}
                    role="option"
                    onClick={() => chooseInstance(target.id)}
                  >
                    {target.name}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className={classes.posterAddButton}
              onClick={() => {
                if (targets.length === 1) {
                  chooseInstance(targets[0]!.id);
                  return;
                }
                setPickerOpen((open) => !open);
              }}
            >
              Add
            </button>
          </div>
        ) : null}
      </div>
      <div className={classes.title}>
        {item.title}
        {item.year ? ` (${item.year})` : ""}
      </div>
    </div>
  );
});
