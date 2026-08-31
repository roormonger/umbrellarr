import { Tooltip } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { ReactNode } from "react";
import classes from "@/components/movies/detail/MovieDetailToolbar.module.css";

type ToolbarActionProps = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
};

function ToolbarAction({
  label,
  icon,
  onClick,
  disabled,
  busy,
  danger,
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

  if (!disabled) return button;
  return (
    <Tooltip label={label} withArrow position="bottom">
      <span>{button}</span>
    </Tooltip>
  );
}

type Props = {
  pending: boolean;
  approving?: boolean;
  declining?: boolean;
  onViewRequest: () => void;
  onApprove: () => void;
  onDecline: () => void;
};

export function RequestDetailToolbar({
  pending,
  approving,
  declining,
  onViewRequest,
  onApprove,
  onDecline,
}: Props) {
  return (
    <div className={classes.bar} role="toolbar" aria-label="Request actions">
      <div className={classes.group}>
        <ToolbarAction
          label="View Request"
          icon={<PencilSimpleIcon size={20} />}
          onClick={onViewRequest}
          disabled={!pending}
        />
        <ToolbarAction
          label="Approve"
          icon={<CheckIcon size={20} />}
          onClick={onApprove}
          disabled={!pending}
          busy={approving}
        />
        <ToolbarAction
          label="Decline"
          icon={<XIcon size={20} />}
          onClick={onDecline}
          disabled={!pending}
          busy={declining}
          danger
        />
      </div>
    </div>
  );
}
