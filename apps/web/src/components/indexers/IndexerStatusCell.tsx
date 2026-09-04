import { Text, Tooltip } from "@mantine/core";
import { ArrowBendUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowBendUpRight";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type { IndexerListItem, IndexerStatusKind } from "@umbrellarr/shared";
import type { ReactNode } from "react";
import { statusLabel } from "@/lib/indexerDisplay";

const statusMeta: Record<IndexerStatusKind, { icon: ReactNode; color: string }> = {
  enabled: { icon: <CheckIcon size={16} weight="bold" />, color: "teal" },
  enabledRedirected: { icon: <ArrowBendUpRightIcon size={16} weight="bold" />, color: "blue" },
  disabled: { icon: <ProhibitIcon size={16} />, color: "gray" },
  error: { icon: <WarningCircleIcon size={16} />, color: "orange" },
};

export function IndexerStatusCell({ item }: { item: IndexerListItem }) {
  const meta = statusMeta[item.statusKind];
  return (
    <Tooltip label={statusLabel(item.statusKind)} withArrow>
      <Text c={meta.color} style={{ display: "inline-flex" }}>
        {meta.icon}
      </Text>
    </Tooltip>
  );
}
