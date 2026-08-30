import { MantineProvider } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_HIGHLIGHT_COLOR, type AppearanceSettings } from "@umbrellarr/shared";
import { useEffect, useMemo, type ReactNode } from "react";
import { getAppearance } from "@/api/settings";
import { NebulaBackground } from "@/components/background/NebulaBackground";
import { applyHighlightCssVars } from "@/lib/highlightCss";
import { createAppTheme } from "@/theme";

export const APPEARANCE_QUERY_KEY = ["appearance"] as const;

type Props = {
  children: ReactNode;
};

export function AppearanceProvider({ children }: Props) {
  const appearanceQuery = useQuery({
    queryKey: APPEARANCE_QUERY_KEY,
    queryFn: getAppearance,
    staleTime: 60_000,
    retry: false,
  });

  const highlightColor =
    appearanceQuery.data?.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR;

  const theme = useMemo(() => createAppTheme(highlightColor), [highlightColor]);

  useEffect(() => {
    applyHighlightCssVars(highlightColor);
  }, [highlightColor]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <NebulaBackground color={highlightColor} />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100%" }}>{children}</div>
    </MantineProvider>
  );
}

export type { AppearanceSettings };
