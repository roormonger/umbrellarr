import { Badge, Stack, Table, Text } from "@mantine/core";
import type { MovieExtraFile, MovieFile } from "@umbrellarr/shared";
import { formatFreeSpace } from "@/lib/moviePath";

function SectionTitle({ children }: { children: string }) {
  return (
    <Text fw={600} size="sm" mb="xs">
      {children}
    </Text>
  );
}

export function MovieDetailFiles({
  files,
  extraFiles,
}: {
  files: MovieFile[];
  extraFiles: MovieExtraFile[];
}) {
  if (files.length === 0 && extraFiles.length === 0) return null;

  return (
    <Stack gap="lg">
      {files.length > 0 && (
        <div>
          <SectionTitle>Files</SectionTitle>
          <Table striped highlightOnHover withTableBorder withColumnBorders layout="fixed">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Relative Path</Table.Th>
                <Table.Th w={90}>Video</Table.Th>
                <Table.Th w={110}>Audio</Table.Th>
                <Table.Th w={80}>Size</Table.Th>
                <Table.Th w={100}>Languages</Table.Th>
                <Table.Th w={100}>Quality</Table.Th>
                <Table.Th w={100}>Release Group</Table.Th>
                <Table.Th w={140}>Formats</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {files.map((file) => (
                <Table.Tr key={file.id}>
                  <Table.Td>
                    <Text size="sm" truncate title={file.relativePath}>
                      {file.relativePath || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.videoCodec ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.audioInfo ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {file.size != null ? formatFreeSpace(file.size) : "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {file.languages.length
                      ? file.languages.map((lang) => (
                          <Badge key={lang} size="xs" mr={4} variant="light">
                            {lang}
                          </Badge>
                        ))
                      : "—"}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.quality ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.releaseGroup ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    {file.customFormats.length
                      ? file.customFormats.map((fmt) => (
                          <Badge key={fmt} size="xs" mr={4} color="violet" variant="light">
                            {fmt}
                          </Badge>
                        ))
                      : "—"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {extraFiles.length > 0 && (
        <div>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Relative Path</Table.Th>
                <Table.Th w={120}>Extension</Table.Th>
                <Table.Th w={120}>Type</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {extraFiles.map((file) => (
                <Table.Tr key={file.id}>
                  <Table.Td>
                    <Text size="sm">{file.relativePath || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.extension ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" tt="capitalize">
                      {file.type}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Stack>
  );
}
