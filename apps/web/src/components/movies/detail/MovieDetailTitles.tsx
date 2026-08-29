import { Table, Text } from "@mantine/core";
import type { MovieAlternativeTitle } from "@umbrellarr/shared";
import panel from "./MovieDetailPanel.module.css";

export function MovieDetailTitles({ titles }: { titles: MovieAlternativeTitle[] }) {
  if (titles.length === 0) return null;

  return (
    <section className={panel.panel}>
      <Text className={panel.heading}>Titles</Text>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Alternative Title</Table.Th>
            <Table.Th w={140}>Type</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {titles.map((title) => (
            <Table.Tr key={title.id}>
              <Table.Td>
                <Text size="sm">{title.title}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" tt="lowercase">
                  {title.sourceType}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </section>
  );
}
