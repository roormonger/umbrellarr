import { Badge, Button, Menu, Text } from "@mantine/core";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FilmStripIcon } from "@phosphor-icons/react/dist/csr/FilmStrip";
import type { IssueLibraryTarget, IssuePageDetail } from "@umbrellarr/shared";
import { useNavigate } from "@tanstack/react-router";
import {
  MediaDetailHero,
  MetaRow,
} from "@/components/media/detail/MediaDetailHero";
import mediaClasses from "@/components/media/detail/MediaDetailHero.module.css";
import {
  formatRelativeTime,
  issueStatusColor,
  issueStatusLabel,
  issueTypeLabel,
} from "@/lib/issueDisplay";
import classes from "./IssueDetailHero.module.css";

type Props = {
  issue: IssuePageDetail;
  closing?: boolean;
  onCloseIssue?: () => void;
};

function openLibraryTarget(navigate: ReturnType<typeof useNavigate>, target: IssueLibraryTarget) {
  if (target.mediaType === "movie") {
    void navigate({
      to: "/movies/$instanceId/$movieId",
      params: { instanceId: target.instanceId, movieId: String(target.externalId) },
    });
    return;
  }
  void navigate({
    to: "/shows/$instanceId/$seriesId",
    params: { instanceId: target.instanceId, seriesId: String(target.externalId) },
  });
}

function LibraryTargetButton({ targets }: { targets: IssueLibraryTarget[] }) {
  const navigate = useNavigate();

  if (targets.length === 0) {
    return (
      <Button variant="light" color="gray" fullWidth disabled>
        Not in library
      </Button>
    );
  }

  if (targets.length === 1) {
    const target = targets[0]!;
    return (
      <Button
        variant="light"
        color="violet"
        fullWidth
        leftSection={<FilmStripIcon size={16} />}
        onClick={() => openLibraryTarget(navigate, target)}
      >
        View in library
      </Button>
    );
  }

  return (
    <Menu withinPortal position="bottom-end" width="target">
      <Menu.Target>
        <Button
          variant="light"
          color="violet"
          fullWidth
          leftSection={<FilmStripIcon size={16} />}
          rightSection={<CaretDownIcon size={14} />}
        >
          View in library
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {targets.map((target) => (
          <Menu.Item key={target.instanceId} onClick={() => openLibraryTarget(navigate, target)}>
            {target.instanceName}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function IssueInfoPanel({ issue }: { issue: IssuePageDetail }) {
  const lastUpdated = issue.updatedAt ?? issue.createdAt;

  return (
    <div className={classes.infoList}>
      <div className={classes.infoCell}>
        <span className={classes.infoLabel}>Type</span>
        <span className={classes.infoValue}>{issueTypeLabel(issue.issueType)}</span>
      </div>

      {issue.mediaType === "tv" ? (
        <>
          <div className={classes.infoCell}>
            <span className={classes.infoLabel}>Affected season</span>
            <div className={classes.infoScope}>
              <span className={classes.scopeChip}>
                {issue.problemSeason > 0 ? issue.problemSeason : "All"}
              </span>
            </div>
          </div>
          {issue.problemSeason > 0 ? (
            <div className={classes.infoCell}>
              <span className={classes.infoLabel}>Affected episode</span>
              <div className={classes.infoScope}>
                <span className={classes.scopeChip}>
                  {issue.problemEpisode > 0 ? issue.problemEpisode : "All"}
                </span>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className={classes.infoCell}>
        <span className={classes.infoLabel}>Last updated</span>
        <span className={classes.infoValue}>{formatRelativeTime(lastUpdated)}</span>
      </div>
    </div>
  );
}

export function IssueDetailHero({ issue, closing, onCloseIssue }: Props) {
  const openedBy = issue.createdBy?.displayName;
  const sublineParts = [
    `#${issue.id}`,
    `opened ${formatRelativeTime(issue.createdAt)}`,
    openedBy ? `by ${openedBy}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return (
    <MediaDetailHero
      title={issue.year ? `${issue.title} (${issue.year})` : issue.title}
      posterUrl={issue.posterUrl}
      overview={issue.overview}
      sublineParts={sublineParts}
      ratingParts={[]}
      links={[]}
      hideMonitor
      titleBadge={
        <Badge size="sm" color={issueStatusColor(issue.status)} variant="light">
          {issueStatusLabel(issue.status)}
        </Badge>
      }
      linksHeading=""
      linksContent={<IssueInfoPanel issue={issue} />}
      meta={
        <MetaRow label="Description" wide>
          {issue.description ? (
            <Text size="sm" className={mediaClasses.path} style={{ whiteSpace: "pre-wrap" }}>
              {issue.description}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              No description provided.
            </Text>
          )}
        </MetaRow>
      }
      trailerContent={
        <div className={mediaClasses.trailerActions}>
          <Button
            color="red"
            variant="light"
            fullWidth
            leftSection={<CheckIcon size={16} />}
            loading={closing}
            disabled={issue.status !== "open"}
            onClick={onCloseIssue}
          >
            Close issue
          </Button>
          <LibraryTargetButton targets={issue.libraryTargets} />
        </div>
      }
    />
  );
}
