import { Menu } from "@mantine/core";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { useQuery } from "@tanstack/react-query";
import type { InstanceKind, InstancePublic } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import { listInstances } from "@/api/instances";
import { pickInstanceId, setLastInstanceId } from "@/lib/lastInstance";
import classes from "./Discover.module.css";

type Props = {
  mediaType: "movie" | "tv";
  /** Visual variant for Featured hero vs default chrome. */
  variant?: "featured" | "default";
  disabled?: boolean;
  onAdd: (instanceId: string) => void;
};

function kindForMedia(mediaType: "movie" | "tv"): InstanceKind {
  return mediaType === "movie" ? "radarr" : "sonarr";
}

export function DiscoverAddSplitButton({
  mediaType,
  variant = "default",
  disabled,
  onAdd,
}: Props) {
  const kind = kindForMedia(mediaType);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const targets = useMemo(
    () => (instancesQuery.data?.instances ?? []).filter((i) => i.kind === kind),
    [instancesQuery.data?.instances, kind],
  );

  useEffect(() => {
    const next = pickInstanceId(kind, targets) ?? targets[0]?.id ?? null;
    setSelectedId(next);
  }, [kind, targets]);

  const selected: InstancePublic | undefined =
    targets.find((i) => i.id === selectedId) ?? targets[0];
  const canAdd = Boolean(selected) && !disabled;
  const label = selected ? `Add to ${selected.name}` : "Add to library";

  function chooseInstance(id: string) {
    setSelectedId(id);
    setLastInstanceId(kind, id);
  }

  function handlePrimary() {
    if (!selected) return;
    setLastInstanceId(kind, selected.id);
    onAdd(selected.id);
  }

  const rootClass =
    variant === "featured" ? classes.addSplitFeatured : classes.addSplitDefault;

  return (
    <div className={`${classes.addSplit} ${rootClass}`}>
      <button
        type="button"
        className={classes.addSplitPrimary}
        disabled={!canAdd}
        onClick={handlePrimary}
        title={canAdd ? undefined : `Add a ${kind === "radarr" ? "Radarr" : "Sonarr"} instance in Settings`}
      >
        <span className={classes.addSplitLabel}>{label}</span>
      </button>
      {targets.length > 1 ? (
        <Menu
          withinPortal
          position="bottom-end"
          offset={4}
          disabled={!canAdd}
        >
          <Menu.Target>
            <button
              type="button"
              className={classes.addSplitChevron}
              disabled={!canAdd}
              aria-label="Choose instance"
            >
              <CaretDownIcon size={14} weight="bold" />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            {targets.map((instance) => (
              <Menu.Item
                key={instance.id}
                onClick={() => chooseInstance(instance.id)}
                data-selected={instance.id === selected?.id || undefined}
              >
                {instance.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      ) : null}
    </div>
  );
}
