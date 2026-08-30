import { generateColors } from "@mantine/colors-generator";
import { createTheme, type MantineThemeOverride } from "@mantine/core";
import { DEFAULT_HIGHLIGHT_COLOR } from "@umbrellarr/shared";

const glassSurface = {
  backgroundColor: "var(--glass-bg)",
  backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
} as const;

export function createAppTheme(highlightColor: string = DEFAULT_HIGHLIGHT_COLOR): MantineThemeOverride {
  return createTheme({
    primaryColor: "violet",
    colors: {
      violet: generateColors(highlightColor),
    },
    fontFamily: "Inter, system-ui, sans-serif",
    defaultRadius: "md",
    components: {
      AppShell: {
        styles: {
          main: {
            backgroundColor: "transparent",
          },
          header: {
            backgroundColor: "var(--glass-bg)",
            backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            borderColor: "var(--glass-border)",
          },
          navbar: {
            backgroundColor: "var(--glass-bg)",
            backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            borderColor: "var(--glass-border)",
          },
        },
      },
      Paper: {
        styles: {
          root: glassSurface,
        },
      },
      Card: {
        styles: {
          root: glassSurface,
        },
      },
      Modal: {
        styles: {
          overlay: {
            backgroundColor: "rgba(12, 8, 18, 0.46)",
          },
          content: glassSurface,
          header: {
            backgroundColor: "transparent",
          },
        },
      },
      Menu: {
        styles: {
          dropdown: glassSurface,
        },
      },
      Popover: {
        styles: {
          dropdown: glassSurface,
        },
      },
      Combobox: {
        styles: {
          dropdown: glassSurface,
        },
      },
      Tooltip: {
        defaultProps: {
          withArrow: true,
        },
        styles: {
          tooltip: glassSurface,
          arrow: {
            backgroundColor: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          },
        },
      },
      Notification: {
        styles: {
          root: glassSurface,
        },
      },
    },
  });
}

/** @deprecated Prefer createAppTheme(highlight) — kept for any static imports. */
export const theme = createAppTheme();
