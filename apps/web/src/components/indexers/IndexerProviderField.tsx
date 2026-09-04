import {
  Alert,
  Anchor,
  Checkbox,
  MultiSelect,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
} from "@mantine/core";
import {
  INDEXER_SECRET_SENTINEL,
  type IndexerField,
  type IndexerSelectOption,
} from "@umbrellarr/shared";

const UNSUPPORTED_TYPES = new Set([
  "captcha",
  "cardiganncaptcha",
  "oauth",
  "device",
  "path",
  "filepath",
]);

export function isIndexerFieldVisible(
  field: IndexerField,
  value: unknown,
  advancedSettings: boolean,
): boolean {
  if (field.hidden === "hidden") return false;
  if (field.hidden === "hiddenIfNotSet" && !hasValue(value)) return false;
  if (field.advanced && !advancedSettings) return false;
  return true;
}

export function isIndexerSecretField(field: IndexerField): boolean {
  const privacy = (field.privacy ?? "").toLowerCase();
  if (privacy === "apikey" || privacy === "password") return true;
  return field.type.toLowerCase() === "password";
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function optionData(options: IndexerSelectOption[], value: unknown) {
  const data = options.map((option) => ({
    value: String(option.value),
    label: option.hint ? `${option.name} (${option.hint})` : option.name,
  }));
  if (value == null || value === "") return data;
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    const key = String(item);
    if (!data.some((row) => row.value === key)) {
      data.unshift({ value: key, label: key });
    }
  }
  return data;
}

function parseSelectValue(raw: string, options: IndexerSelectOption[]): string | number {
  const match = options.find((option) => String(option.value) === raw);
  if (match) return match.value;
  const numeric = Number(raw);
  if (raw !== "" && Number.isFinite(numeric) && String(numeric) === raw) return numeric;
  return raw;
}

function tagList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function FieldHelp({ field }: { field: IndexerField }) {
  return (
    <Stack gap={4}>
      {field.helpTextWarning ? (
        <Text size="xs" c="orange">
          {field.helpTextWarning}
        </Text>
      ) : null}
      {field.helpLink ? (
        <Anchor href={field.helpLink} target="_blank" rel="noreferrer" size="xs">
          More info
        </Anchor>
      ) : null}
    </Stack>
  );
}

export function IndexerProviderField({
  field,
  value,
  onChange,
}: {
  field: IndexerField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const type = field.type.toLowerCase();
  const secret = isIndexerSecretField(field);
  const options = field.selectOptions ?? [];
  const description = field.helpText;
  const help = <FieldHelp field={field} />;

  if (UNSUPPORTED_TYPES.has(type)) {
    return (
      <Alert color="gray" title={field.label}>
        <Text size="sm">
          This setting is not supported in Umbrellarr yet. The stored value is kept on save.
        </Text>
        {help}
      </Alert>
    );
  }

  if (type === "info") {
    const text = stripHtml(
      (typeof value === "string" && value) || field.helpText || field.label,
    );
    return (
      <Alert color="blue" title={field.label}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Text>
        {help}
      </Alert>
    );
  }

  if (type === "checkbox") {
    return (
      <Stack gap={4}>
        <Checkbox
          label={field.label}
          description={description}
          checked={value === true}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {help}
      </Stack>
    );
  }

  if (type === "number") {
    return (
      <Stack gap={4}>
        <NumberInput
          label={field.label}
          description={description}
          placeholder={field.placeholder}
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          allowDecimal={field.isFloat === true}
          onChange={(next) => onChange(next === "" ? "" : next)}
        />
        {help}
      </Stack>
    );
  }

  if (type === "tag") {
    return (
      <Stack gap={4}>
        <TagsInput
          label={field.label}
          description={description}
          placeholder={field.placeholder}
          value={tagList(value)}
          onChange={(next) =>
            onChange(typeof field.value === "string" ? next.join(",") : next)
          }
        />
        {help}
      </Stack>
    );
  }

  if (type === "tagselect") {
    return (
      <Stack gap={4}>
        <MultiSelect
          label={field.label}
          description={description}
          data={optionData(options, value)}
          value={Array.isArray(value) ? value.map(String) : tagList(value)}
          onChange={(next) => onChange(next.map((item) => parseSelectValue(item, options)))}
          searchable
          clearable
        />
        {help}
      </Stack>
    );
  }

  if (type === "select") {
    if (Array.isArray(value)) {
      return (
        <Stack gap={4}>
          <MultiSelect
            label={field.label}
            description={description}
            data={optionData(options, value)}
            value={value.map(String)}
            onChange={(next) => onChange(next.map((item) => parseSelectValue(item, options)))}
            searchable
            clearable
          />
          {help}
        </Stack>
      );
    }
    return (
      <Stack gap={4}>
        <Select
          label={field.label}
          description={description}
          placeholder={field.placeholder}
          data={optionData(options, value)}
          value={value == null || value === "" ? null : String(value)}
          onChange={(next) => onChange(next == null ? "" : parseSelectValue(next, options))}
          searchable
          clearable
          allowDeselect
        />
        {help}
      </Stack>
    );
  }

  if (secret || type === "password") {
    return (
      <Stack gap={4}>
        <PasswordInput
          label={field.label}
          description={description}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.currentTarget.value)}
          autoComplete="new-password"
        />
        {value === INDEXER_SECRET_SENTINEL ? (
          <Text size="xs" c="dimmed">
            Leave unchanged to keep the stored value.
          </Text>
        ) : null}
        {help}
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <TextInput
        label={field.label}
        description={description}
        placeholder={field.placeholder}
        value={value == null ? "" : String(value)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {help}
    </Stack>
  );
}
