import type { ArrKind, Instance } from "@umbrellarr/shared";

const KIND_PREFIXES: Array<{ kind: ArrKind; prefix: string }> = [
  { kind: "radarr", prefix: "RADARR" },
  { kind: "sonarr", prefix: "SONARR" },
];

/**
 * Loads instances from env.
 * Examples:
 *   RADARR_URL + RADARR_API_KEY → id "radarr"
 *   RADARR_4K_URL + RADARR_4K_API_KEY → id "radarr-4k"
 */
export function loadInstancesFromEnv(env: NodeJS.ProcessEnv = process.env): Instance[] {
  const instances: Instance[] = [];

  for (const { kind, prefix } of KIND_PREFIXES) {
    const urlKeys = Object.keys(env).filter(
      (key) => key === `${prefix}_URL` || (key.startsWith(`${prefix}_`) && key.endsWith("_URL")),
    );

    for (const urlKey of urlKeys.sort()) {
      const baseUrl = env[urlKey]?.trim();
      if (!baseUrl) continue;

      const suffix = urlKey.slice(prefix.length, -"_URL".length); // "" or "_4K"
      const apiKeyName = `${prefix}${suffix}_API_KEY`;
      const apiKey = env[apiKeyName]?.trim();
      if (!apiKey) {
        console.warn(`[config] Skipping ${urlKey}: missing ${apiKeyName}`);
        continue;
      }

      const label = suffix ? suffix.slice(1) : "";
      const id = label ? `${kind}-${label.toLowerCase()}` : kind;
      const name = label ? `${capitalize(kind)} ${label}` : capitalize(kind);

      instances.push({
        id,
        name,
        kind,
        baseUrl: baseUrl.replace(/\/+$/, ""),
        apiKey,
      });
    }
  }

  return instances;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
