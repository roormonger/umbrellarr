import { createTheme } from "@mantine/core";

const glassSurface = {
  backgroundColor: "var(--glass-bg)",
  backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
} as const;

export const theme = createTheme({
  primaryColor: "violet",
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
