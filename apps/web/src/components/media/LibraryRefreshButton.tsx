import { ActionIcon, Tooltip } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";

export function LibraryRefreshButton({
  loading,
  onRefresh,
}: {
  loading?: boolean;
  onRefresh: () => void;
}) {
  return (
    <Tooltip label="Refresh library from Arr" withArrow>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Refresh library"
        loading={loading}
        onClick={onRefresh}
      >
        <ArrowsClockwiseIcon size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
