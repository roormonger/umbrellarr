import { Tooltip } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/ListMagnifyingGlass";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { TagIcon } from "@phosphor-icons/react/dist/csr/Tag";
import { TextIndentIcon } from "@phosphor-icons/react/dist/csr/TextIndent";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { ReactNode } from "react";
import classes from "@/components/shows/detail/ShowDetailToolbar.module.css";

type ToolbarActionProps = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
  title?: string;
};

function ToolbarAction({
  label,
  icon,
  onClick,
  disabled,
  busy,
  danger,
  title,
}: ToolbarActionProps) {
  const button = (
    <button
      type="button"
      className={classes.action}
      disabled={disabled || busy}
      data-danger={danger || undefined}
      data-busy={busy || undefined}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
      <span className={classes.label}>{label}</span>
    </button>
  );

  if (!title && !disabled) return button;

  return (
    <Tooltip label={title ?? label} withArrow position="bottom">
      <span>{button}</span>
    </Tooltip>
  );
}

type Props = {
  refreshing?: boolean;
  searching?: boolean;
  deleting?: boolean;
  hasFiles?: boolean;
  onRefreshScan: () => void;
  onSearchMonitored: () => void;
  onInteractiveSearch: () => void;
  onPreviewRename: () => void;
  onPreviewRetag: () => void;
  onManageTracks: () => void;
  onHistory: () => void;
  onArtistMonitoring: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Lidarr ArtistDetails toolbar (Manual Import deferred). */
export function ArtistDetailToolbar({
  refreshing,
  searching,
  deleting,
  hasFiles = false,
  onRefreshScan,
  onSearchMonitored,
  onInteractiveSearch,
  onPreviewRename,
  onPreviewRetag,
  onManageTracks,
  onHistory,
  onArtistMonitoring,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className={classes.bar} role="toolbar" aria-label="Artist actions">
      <div className={classes.group}>
        <ToolbarAction
          label="Refresh & Scan"
          icon={<ArrowsClockwiseIcon size={22} />}
          busy={refreshing}
          onClick={onRefreshScan}
        />
        <ToolbarAction
          label="Search Monitored"
          icon={<MagnifyingGlassIcon size={22} />}
          busy={searching}
          onClick={onSearchMonitored}
        />
        <ToolbarAction
          label="Interactive Search"
          icon={<ListMagnifyingGlassIcon size={22} />}
          onClick={onInteractiveSearch}
        />
        <ToolbarAction
          label="Preview Rename"
          icon={<TextIndentIcon size={22} />}
          disabled={!hasFiles}
          title={hasFiles ? undefined : "No track files to rename"}
          onClick={onPreviewRename}
        />
        <ToolbarAction
          label="Preview Retag"
          icon={<TagIcon size={22} />}
          disabled={!hasFiles}
          title={hasFiles ? undefined : "No track files to retag"}
          onClick={onPreviewRetag}
        />
        <ToolbarAction
          label="Manage Tracks"
          icon={<FileTextIcon size={22} />}
          disabled={!hasFiles}
          title={hasFiles ? undefined : "No track files to manage"}
          onClick={onManageTracks}
        />
        <ToolbarAction
          label="History"
          icon={<ClockCounterClockwiseIcon size={22} />}
          onClick={onHistory}
        />
        <ToolbarAction
          label="Artist Monitoring"
          icon={<BookmarkSimpleIcon size={22} />}
          onClick={onArtistMonitoring}
        />
      </div>

      <div className={classes.divider} aria-hidden />

      <div className={classes.group}>
        <ToolbarAction label="Edit" icon={<WrenchIcon size={22} />} onClick={onEdit} />
        <ToolbarAction
          label="Delete"
          icon={<TrashIcon size={22} />}
          danger
          busy={deleting}
          onClick={onDelete}
        />
      </div>
    </div>
  );
}
