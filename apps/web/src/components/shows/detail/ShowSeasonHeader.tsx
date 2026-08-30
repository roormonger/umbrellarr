import { ActionIcon, Tooltip } from "@mantine/core";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/ListMagnifyingGlass";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { TextIndentIcon } from "@phosphor-icons/react/dist/csr/TextIndent";
import type { SeriesSeasonSummary } from "@umbrellarr/shared";
import { formatFreeSpace } from "@/lib/moviePath";
import { seasonCountTone, seasonLabel } from "./showSeasonLabel";
import classes from "./ShowSeasonsPanel.module.css";

type Props = {
  season: SeriesSeasonSummary;
  expanded: boolean;
  searching?: boolean;
  monitoring?: boolean;
  onToggleExpand: () => void;
  onToggleMonitor: () => void;
  onSearch: () => void;
  onInteractiveSearch: () => void;
  onPreviewRename: () => void;
  onManageFiles: () => void;
  onHistory: () => void;
};

export function ShowSeasonHeader({
  season,
  expanded,
  searching,
  monitoring,
  onToggleExpand,
  onToggleMonitor,
  onSearch,
  onInteractiveSearch,
  onPreviewRename,
  onManageFiles,
  onHistory,
}: Props) {
  const hasFiles = season.episodeFileCount > 0;
  const tone = seasonCountTone(season.episodeFileCount, season.episodeCount);
  const size =
    season.sizeOnDisk != null && season.sizeOnDisk > 0
      ? formatFreeSpace(season.sizeOnDisk)
      : null;

  return (
    <div className={classes.header}>
      <Tooltip
        label={season.monitored ? "Unmonitor season" : "Monitor season"}
        withArrow
      >
        <ActionIcon
          variant="subtle"
          color={season.monitored ? "violet" : "gray"}
          size="md"
          aria-label={season.monitored ? "Unmonitor season" : "Monitor season"}
          loading={monitoring}
          onClick={onToggleMonitor}
        >
          <BookmarkSimpleIcon size={18} weight={season.monitored ? "fill" : "regular"} />
        </ActionIcon>
      </Tooltip>

      <button
        type="button"
        className={classes.expand}
        aria-expanded={expanded}
        onClick={onToggleExpand}
      >
        <span className={classes.chevron} data-open={expanded || undefined}>
          <CaretDownIcon size={16} />
        </span>
        <span className={classes.title}>{seasonLabel(season.seasonNumber)}</span>
        <span className={classes.meta}>
          <span className={classes.count} data-tone={tone}>
            {season.episodeFileCount}/{season.episodeCount}
          </span>
          {size ? <span>{size}</span> : null}
        </span>
      </button>

      <div className={classes.tools}>
        <Tooltip label="Search" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Search ${seasonLabel(season.seasonNumber)}`}
            loading={searching}
            onClick={onSearch}
          >
            <MagnifyingGlassIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Interactive Search" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Interactive search ${seasonLabel(season.seasonNumber)}`}
            onClick={onInteractiveSearch}
          >
            <ListMagnifyingGlassIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={hasFiles ? "Preview Rename" : "No episode files to rename"} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Preview rename ${seasonLabel(season.seasonNumber)}`}
            disabled={!hasFiles}
            onClick={onPreviewRename}
          >
            <TextIndentIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={hasFiles ? "Manage Episode Files" : "No episode files to manage"}
          withArrow
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`Manage files ${seasonLabel(season.seasonNumber)}`}
            disabled={!hasFiles}
            onClick={onManageFiles}
          >
            <FileTextIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="View History" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            aria-label={`History ${seasonLabel(season.seasonNumber)}`}
            onClick={onHistory}
          >
            <ClockCounterClockwiseIcon size={18} />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}
