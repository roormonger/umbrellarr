import {
  Checkbox,
  Combobox,
  Group,
  Input,
  InputBase,
  useCombobox,
} from "@mantine/core";
import { useMemo, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  multiLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
};

function displayLabel(
  selected: Option[],
  multiLabel: string,
): string {
  if (selected.length === 0) return "";
  if (selected.length === 1) return selected[0]?.label ?? "";
  return multiLabel;
}

export function CheckboxMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  multiLabel = "Multiple",
  searchPlaceholder = "Search",
  disabled,
  size = "xs",
}: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });

  const [search, setSearch] = useState("");

  const selectedOptions = useMemo(() => {
    const byId = new Map(options.map((option) => [option.value, option]));
    return value
      .map((id) => byId.get(id))
      .filter((option): option is Option => option != null);
  }, [options, value]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search]);

  const label = displayLabel(selectedOptions, multiLabel);

  function toggle(next: string) {
    onChange(
      value.includes(next) ? value.filter((id) => id !== next) : [...value, next],
    );
  }

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={toggle}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          size={size}
          pointer
          disabled={disabled}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => {
            if (disabled) return;
            combobox.toggleDropdown();
          }}
          styles={{
            input: {
              minHeight: "var(--input-height-xs)",
              height: "var(--input-height-xs)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        >
          {label || <Input.Placeholder>{placeholder}</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={searchPlaceholder}
        />
        <Combobox.Options mah={220} style={{ overflowY: "auto" }}>
          {filtered.length > 0 ? (
            filtered.map((option) => {
              const checked = value.includes(option.value);
              return (
                <Combobox.Option value={option.value} key={option.value} active={checked}>
                  <Group gap="sm" wrap="nowrap">
                    <Checkbox
                      size="xs"
                      checked={checked}
                      aria-hidden
                      tabIndex={-1}
                      style={{ pointerEvents: "none" }}
                      readOnly
                    />
                    <span>{option.label}</span>
                  </Group>
                </Combobox.Option>
              );
            })
          ) : (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
