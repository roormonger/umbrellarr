import { ActionIcon, Button, Group, SegmentedControl, Text } from "@mantine/core";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CALENDAR_VIEW_OPTIONS, type CalendarView } from "@umbrellarr/shared";

export function CalendarToolbar({
  title,
  view,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  onIcal,
}: {
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onIcal: () => void;
}) {
  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
      <Group gap="xs" wrap="nowrap">
        <Button variant="default" size="sm" onClick={onToday}>
          Today
        </Button>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label="Previous"
          onClick={onPrev}
        >
          <CaretLeftIcon size={18} />
        </ActionIcon>
        <ActionIcon variant="default" size="lg" aria-label="Next" onClick={onNext}>
          <CaretRightIcon size={18} />
        </ActionIcon>
        <Text fw={650} size="lg" style={{ whiteSpace: "nowrap" }}>
          {title}
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <SegmentedControl
          size="sm"
          value={view}
          onChange={(value) => onViewChange(value as CalendarView)}
          data={CALENDAR_VIEW_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <Button variant="default" size="sm" onClick={onIcal}>
          iCal Link
        </Button>
      </Group>
    </Group>
  );
}
