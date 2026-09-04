import { Text } from "@mantine/core";
import type { DiscoverSection } from "@umbrellarr/shared";
import { DiscoverMediaRow } from "./DiscoverMediaRow";
import classes from "./Discover.module.css";

export function DiscoverSectionBlock({
  section,
  instanceId,
}: {
  section: DiscoverSection;
  instanceId: string;
}) {
  return (
    <section className={classes.section} aria-label={section.title}>
      <Text className={classes.sectionTitle}>{section.title}</Text>
      {section.rows.map((row) => (
        <DiscoverMediaRow
          key={row.key}
          row={row}
          instanceId={instanceId}
          mediaType={section.mediaType}
        />
      ))}
    </section>
  );
}
