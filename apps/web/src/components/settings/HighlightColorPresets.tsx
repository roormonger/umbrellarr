import { ActionIcon, ColorSwatch, Group, Text } from "@mantine/core";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { DEFAULT_HIGHLIGHT_COLOR } from "@umbrellarr/shared";
import { useMemo, useState, type ReactNode } from "react";
import classes from "./HighlightColorPresets.module.css";

/** 6 pages × 4×5 = 120 presets (page 5 is heavy on reds). */
const HIGHLIGHT_PRESET_PAGES: string[][] = [
  // Violets / purples
  [
    DEFAULT_HIGHLIGHT_COLOR,
    "#E5DBFF",
    "#D0BFFF",
    "#B197FC",
    "#9775FA",
    "#845EF7",
    "#7950F2",
    "#7048E8",
    "#6741D9",
    "#5F3DC4",
    "#DA77F2",
    "#CC5DE8",
    "#BE4BDB",
    "#AE3EC9",
    "#9C36B5",
    "#862E9C",
    "#9B59B6",
    "#8E44AD",
    "#6C3483",
    "#5B2C6F",
  ],
  // Blues
  [
    "#D0EBFF",
    "#A5D8FF",
    "#74C0FC",
    "#4DABF7",
    "#339AF0",
    "#228BE6",
    "#1C7ED6",
    "#1971C2",
    "#1864AB",
    "#748FFC",
    "#5C7CFA",
    "#4C6EF5",
    "#4263EB",
    "#3B5BDB",
    "#364FC7",
    "#4A6FA5",
    "#3D5A80",
    "#274C77",
    "#1B3A4B",
    "#0D1B2A",
  ],
  // Cyans / teals / greens
  [
    "#C3FAE8",
    "#96F2D7",
    "#63E6BE",
    "#38D9A9",
    "#20C997",
    "#12B886",
    "#0CA678",
    "#099268",
    "#087F5B",
    "#22B8CF",
    "#15AABF",
    "#1098AD",
    "#0C8599",
    "#0B7285",
    "#B2F2BB",
    "#8CE99A",
    "#69DB7C",
    "#51CF66",
    "#40C057",
    "#2F9E44",
  ],
  // Yellows / ambers / oranges
  [
    "#FFF3BF",
    "#FFEC99",
    "#FFE066",
    "#FFD43B",
    "#FCC419",
    "#FAB005",
    "#F59F00",
    "#F08C00",
    "#E67700",
    "#FFE8CC",
    "#FFD8A8",
    "#FFC078",
    "#FFA94D",
    "#FF922B",
    "#FD7E14",
    "#F76707",
    "#E8590C",
    "#D9480F",
    "#BF400D",
    "#A33B0A",
  ],
  // Reds (dedicated — blush through scarlet / brick / wine)
  [
    "#FFE3E3",
    "#FFC9C9",
    "#FFA8A8",
    "#FF8787",
    "#FF6B6B",
    "#FA5252",
    "#F03E3E",
    "#E03131",
    "#C92A2A",
    "#A51111",
    "#FF4D6D",
    "#E63946",
    "#DC3545",
    "#E74C3C",
    "#D32F2F",
    "#C62828",
    "#B71C1C",
    "#9B2226",
    "#7F1D1D",
    "#641220",
  ],
  // Pinks / rose / neutrals
  [
    "#FFDEEB",
    "#FCC2D7",
    "#FAA2C1",
    "#F783AC",
    "#F06595",
    "#E64980",
    "#D6336C",
    "#C2255C",
    "#A61E4D",
    "#FF85A1",
    "#F8F9FA",
    "#F1F3F5",
    "#E9ECEF",
    "#DEE2E6",
    "#CED4DA",
    "#ADB5BD",
    "#868E96",
    "#495057",
    "#343A40",
    "#212529",
  ],
];

const COLS = 5;
const ROWS = 4;
const PAGE_SIZE = COLS * ROWS;

type Props = {
  value: string;
  onChange: (hex: string) => void;
  picker: ReactNode;
  hexField: ReactNode;
};

function pageForColor(hex: string): number {
  const normalized = hex.trim().toUpperCase();
  const index = HIGHLIGHT_PRESET_PAGES.findIndex((page) =>
    page.some((swatch) => swatch.toUpperCase() === normalized),
  );
  return index >= 0 ? index : 0;
}

export function HighlightColorPresets({ value, onChange, picker, hexField }: Props) {
  const normalized = value.trim().toUpperCase();
  const [page, setPage] = useState(() => pageForColor(value));
  const pageCount = HIGHLIGHT_PRESET_PAGES.length;

  // Fresh array each render — never mutate the source pages.
  const swatches = useMemo(() => {
    const pageColors = HIGHLIGHT_PRESET_PAGES[page] ?? [];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const hex of pageColors) {
      const key = hex.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(hex);
      if (unique.length >= PAGE_SIZE) break;
    }
    return unique;
  }, [page]);

  return (
    <div className={classes.layout}>
      <Text size="sm" fw={500} className={classes.labelPicker}>
        Highlight color
      </Text>

      <Group
        className={classes.labelPresets}
        justify="space-between"
        align="center"
        wrap="nowrap"
        gap="sm"
      >
        <Text size="sm" fw={500}>
          Presets
        </Text>
        <Text size="xs" c="dimmed">
          {page + 1} / {pageCount}
        </Text>
      </Group>

      <div className={classes.picker}>{picker}</div>

      <Group gap="sm" align="center" wrap="nowrap" className={classes.presets}>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label="Previous preset page"
          disabled={page <= 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          <CaretLeftIcon size={18} />
        </ActionIcon>

        {/* key=page forces a clean remount so prior-page swatches cannot linger */}
        <div
          key={page}
          className={classes.grid}
          role="list"
          aria-label={`Highlight color presets page ${page + 1}`}
        >
          {swatches.map((hex, index) => {
            const selected = hex.toUpperCase() === normalized;
            return (
              <ColorSwatch
                key={`${index}-${hex.toUpperCase()}`}
                color={hex}
                component="button"
                type="button"
                size={28}
                radius="sm"
                className={classes.swatch}
                aria-label={`Highlight color ${hex}`}
                aria-pressed={selected}
                onClick={() => onChange(hex)}
              >
                {selected ? (
                  <span className={classes.check}>
                    <CheckIcon size={12} />
                  </span>
                ) : null}
              </ColorSwatch>
            );
          })}
        </div>

        <ActionIcon
          variant="default"
          size="lg"
          aria-label="Next preset page"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
        >
          <CaretRightIcon size={18} />
        </ActionIcon>
      </Group>

      <div className={classes.hex}>{hexField}</div>
    </div>
  );
}
