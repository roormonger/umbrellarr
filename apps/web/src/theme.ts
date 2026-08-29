import { createTheme } from "@mantine/core";

/** Match HoverCard/Popover surfaces so tooltips follow light/dark color scheme. */
const floatingSurface = {
  backgroundColor: "var(--mantine-color-body)",
  color: "var(--mantine-color-text)",
  border: "1px solid var(--mantine-color-default-border)",
  boxShadow: "var(--mantine-shadow-md)",
} as const;

export const theme = createTheme({
  primaryColor: "violet",
  fontFamily: "Inter, system-ui, sans-serif",
  defaultRadius: "md",
  components: {
    Tooltip: {
      defaultProps: {
        withArrow: true,
      },
      styles: {
        tooltip: floatingSurface,
        arrow: {
          backgroundColor: "var(--mantine-color-body)",
          border: "1px solid var(--mantine-color-default-border)",
        },
      },
    },
  },
});
